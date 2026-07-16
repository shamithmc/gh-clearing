package com.airline.api.dto;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.Set;

@Data
public class UserRequest {

    @NotBlank
    private String id;

    @NotBlank
    private String username;

    @Email
    @NotBlank
    private String email;

    @NotEmpty
    private Set<String> roles;
}
