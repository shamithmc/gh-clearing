package com.airline.config;

import com.airline.domain.User;
import com.airline.repository.TenantRepository;
import com.airline.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.HashSet;

@Component
@Profile({"dev", "e2e"})
public class DevUserInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;

    public DevUserInitializer(UserRepository userRepository, TenantRepository tenantRepository) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        provisionUser("SWISSPORT", false);
        provisionUser("SWISSPORT", true);
        provisionUser("EK", false);
        provisionUser("EK", true);
    }

    private void provisionUser(String tenantId, boolean scoped) {
        String userId = "dev-" + tenantId + (scoped ? "-scoped" : "");
        if (!tenantRepository.existsById(tenantId)) {
            return;
        }

        User user = userRepository.findByIdAndTenantId(userId, tenantId).orElseGet(() -> User.builder()
                .id(userId).tenantId(tenantId).username(userId)
                .email(userId.toLowerCase() + "@local.invalid").build());
        user.setRolesRaw("SWISSPORT".equals(tenantId)
                ? "ADMIN,CONTRACT_ENTRY,CONTRACT_APPROVER,INVOICE_ENTRY,INVOICE_APPROVER,STATUS_UPDATER,MIS_VIEWER,RFP_MONITOR,DISPUTE_HANDLER,DISPUTE_APPROVER"
                : "INVOICE_REVIEWER,INVOICE_DISPUTER,CONTRACT_VIEWER,CONTRACT_REVIEWER,RFP_RAISER,MIS_VIEWER,PAYMENT_UPDATER");
        user.setAirportRestrictions(new HashSet<>(scoped ? Set.of("DXB") : Set.of()));
        user.setAirlineRestrictions(new HashSet<>(scoped ? Set.of("EK") : Set.of()));
        user.setChargeCodeRestrictions(new HashSet<>(scoped ? Set.of("BAGGAGE") : Set.of()));
        userRepository.save(user);
    }
}
