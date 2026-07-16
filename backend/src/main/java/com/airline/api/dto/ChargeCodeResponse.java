package com.airline.api.dto;

import com.airline.domain.ChargeCode;
import lombok.Data;

@Data
public class ChargeCodeResponse {
    private String code;
    private String displayName;
    private String description;

    public static ChargeCodeResponse from(ChargeCode c) {
        ChargeCodeResponse r = new ChargeCodeResponse();
        r.setCode(c.getCode());
        r.setDisplayName(c.getDisplayName());
        r.setDescription(c.getDescription());
        return r;
    }
}
