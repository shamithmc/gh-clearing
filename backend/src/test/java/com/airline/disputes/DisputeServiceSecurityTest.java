package com.airline.disputes;

import com.airline.api.dto.InvoiceDisputeRequest;
import com.airline.api.dto.LineItemDisputeRequest;
import com.airline.domain.Dispute;
import com.airline.domain.DisputeCategory;
import com.airline.domain.DisputeLineItem;
import com.airline.domain.DisputeStatus;
import com.airline.domain.CreditNote;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.DisputeRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.DisputeService;
import com.airline.service.CreditNoteService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DisputeServiceSecurityTest {

    @Mock
    private DisputeRepository disputeRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private CreditNoteService creditNoteService;

    @Mock
    private TenantContext tenantContext;

    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private DisputeService disputeService;

    @BeforeEach
    void setUp() {
        disputeService = new DisputeService(
                disputeRepository,
                invoiceRepository,
                creditNoteService,
                tenantContext,
                dimensionalSecurityEvaluator);
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createDispute_groundHandlerCannotInitiate() {
        authenticate("handler-user", "DISPUTE_HANDLER");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        assertThatThrownBy(() -> disputeService.createDispute("invoice-1", request("Incorrect count")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("tenant type");

        verifyNoInteractions(invoiceRepository);
    }

    @Test
    void createDispute_airlineWithoutDisputerRoleCannotInitiate() {
        authenticate("reviewer-user", "INVOICE_REVIEWER");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");

        assertThatThrownBy(() -> disputeService.createDispute("invoice-1", request("Incorrect count")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("INVOICE_DISPUTER");

        verifyNoInteractions(invoiceRepository);
    }

    @Test
    void createDispute_blankLineCommentFailsClosed() {
        authenticate("airline-user", "INVOICE_DISPUTER");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(invoiceRepository.findByIdAndTenantId("invoice-1", "EK"))
                .thenReturn(Optional.of(invoice()));

        assertThatThrownBy(() -> disputeService.createDispute("invoice-1", request("   ")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("comment is required");

        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void getDispute_verifiesAirportAirlineAndChargeCodeDimensions() {
        authenticate("handler-user", "DISPUTE_HANDLER");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        Dispute dispute = dispute(DisputeStatus.OPEN);
        when(disputeRepository.findByIdAndSupplierId("dispute-1", "SWISSPORT"))
                .thenReturn(Optional.of(dispute));

        assertThat(disputeService.getDisputeById("dispute-1")).isSameAs(dispute);

        verify(dimensionalSecurityEvaluator).verifyAccess("DXB", "EK", Set.of("BAGGAGE"));
    }

    @Test
    void accept_handlerWithoutApproverRoleIsDenied() {
        mockGroundHandlerDispute(DisputeStatus.OPEN, "DISPUTE_HANDLER");

        assertThatThrownBy(() -> disputeService.respondToDispute(
                "dispute-1", "Approved adjustment", "ACCEPT"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("DISPUTE_APPROVER");

        verifyNoInteractions(creditNoteService);
    }

    @Test
    void accept_approverGeneratesCreditAndTerminatesDispute() {
        Dispute dispute = mockGroundHandlerDispute(DisputeStatus.OPEN, "DISPUTE_APPROVER");
        when(disputeRepository.save(dispute)).thenReturn(dispute);
        when(creditNoteService.generateForAcceptedDispute(dispute, "Dispute accepted: Approved adjustment"))
                .thenReturn(CreditNote.builder().amount(new BigDecimal("1500.00")).build());

        Dispute result = disputeService.respondToDispute(
                "dispute-1", "Approved adjustment", "ACCEPT");

        assertThat(result.getStatus()).isEqualTo(DisputeStatus.ACCEPTED);
        assertThat(result.getCreditNoteAmount()).isEqualByComparingTo("1500.00");
        verify(creditNoteService).generateForAcceptedDispute(
                dispute, "Dispute accepted: Approved adjustment");
    }

    @Test
    void accept_repeatedTerminalActionIsRejectedWithoutSecondCredit() {
        mockGroundHandlerDispute(DisputeStatus.ACCEPTED, "DISPUTE_APPROVER");

        assertThatThrownBy(() -> disputeService.respondToDispute(
                "dispute-1", "Approve again", "ACCEPT"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("status ACCEPTED");

        verifyNoInteractions(creditNoteService);
    }

    @Test
    void airlineCannotAcceptOrRejectSupplierDecision() {
        mockAirlineDispute(DisputeStatus.RESPONDED);

        assertThatThrownBy(() -> disputeService.respondToDispute(
                "dispute-1", "Airline decision", "REJECT"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Airline users cannot perform");
    }

    @Test
    void airlineCanPushRejectedDisputeBackToOpen() {
        Dispute dispute = mockAirlineDispute(DisputeStatus.REJECTED);
        when(disputeRepository.save(dispute)).thenReturn(dispute);

        Dispute result = disputeService.respondToDispute(
                "dispute-1", "Please recheck supporting data", "RESPOND");

        assertThat(result.getStatus()).isEqualTo(DisputeStatus.OPEN);
        assertThat(result.getMessages()).last().extracting("action").isEqualTo("RESPOND");
    }

    @Test
    void unknownActionFailsClosed() {
        mockGroundHandlerDispute(DisputeStatus.OPEN, "DISPUTE_HANDLER");

        assertThatThrownBy(() -> disputeService.respondToDispute(
                "dispute-1", "Unsupported action", "RESOLVE_ANYWAY"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported dispute action");
    }

    @Test
    void acknowledge_movesOpenDisputeUnderReview() {
        Dispute dispute = mockGroundHandlerDispute(DisputeStatus.OPEN, "DISPUTE_HANDLER");
        when(disputeRepository.save(dispute)).thenReturn(dispute);

        Dispute result = disputeService.respondToDispute(
                "dispute-1", "Investigation started", "ACKNOWLEDGE");

        assertThat(result.getStatus()).isEqualTo(DisputeStatus.UNDER_REVIEW);
    }

    private Dispute mockGroundHandlerDispute(DisputeStatus status, String role) {
        authenticate("ground-handler-user", role);
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        Dispute dispute = dispute(status);
        when(disputeRepository.findByIdAndSupplierIdForUpdate("dispute-1", "SWISSPORT"))
                .thenReturn(Optional.of(dispute));
        return dispute;
    }

    private Dispute mockAirlineDispute(DisputeStatus status) {
        authenticate("airline-user", "INVOICE_DISPUTER");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        Dispute dispute = dispute(status);
        when(disputeRepository.findByIdAndAirlineIdForUpdate("dispute-1", "EK"))
                .thenReturn(Optional.of(dispute));
        return dispute;
    }

    private void authenticate(String userId, String... roles) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(userId, "n/a", roles));
    }

    private Invoice invoice() {
        InvoiceLineItem lineItem = InvoiceLineItem.builder()
                .id("line-1")
                .chargeCode("BAGGAGE")
                .calculatedAmount(new BigDecimal("1500.00"))
                .build();
        return Invoice.builder()
                .id("invoice-1")
                .invoiceNumber("INV-1")
                .status(InvoiceStatus.SENT)
                .airlineId("EK")
                .supplierId("SWISSPORT")
                .airportCode("DXB")
                .lineItems(new ArrayList<>(List.of(lineItem)))
                .build();
    }

    private InvoiceDisputeRequest request(String comment) {
        LineItemDisputeRequest lineItem = new LineItemDisputeRequest();
        lineItem.setLineItemId("line-1");
        lineItem.setCategory(DisputeCategory.OPERATIONAL_DATA_MISMATCH);
        lineItem.setComment(comment);
        InvoiceDisputeRequest request = new InvoiceDisputeRequest();
        request.setLineItems(List.of(lineItem));
        return request;
    }

    private Dispute dispute(DisputeStatus status) {
        Dispute dispute = Dispute.builder()
                .id("dispute-1")
                .invoiceId("invoice-1")
                .invoiceNumber("INV-1")
                .airlineId("EK")
                .supplierId("SWISSPORT")
                .airportCode("DXB")
                .status(status)
                .category(DisputeCategory.OPERATIONAL_DATA_MISMATCH)
                .disputedAmount(new BigDecimal("1500.00"))
                .creditNoteAmount(BigDecimal.ZERO)
                .lineItems(new ArrayList<>())
                .messages(new ArrayList<>())
                .build();
        DisputeLineItem lineItem = DisputeLineItem.builder()
                .id("dispute-line-1")
                .dispute(dispute)
                .lineItemId("line-1")
                .chargeCode("BAGGAGE")
                .disputedAmount(new BigDecimal("1500.00"))
                .reason("Incorrect count")
                .build();
        dispute.getLineItems().add(lineItem);
        return dispute;
    }
}
