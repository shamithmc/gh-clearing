package com.airline.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards all non-API routes to index.html so React Router handles client-side navigation.
 * Without this, direct navigation to /invoices or /contracts on page reload returns 404.
 */
@Controller
public class SpaWebMvcConfig {

    /**
     * Forward any route that is not an API route and not a static resource to the SPA index.html.
     */
    @RequestMapping(value = {
            "/invoices",
            "/invoices/**",
            "/invoices/new",
            "/contracts",
            "/contracts/**"
    })
    public String forwardToIndex(HttpServletRequest request) {
        return "forward:/index.html";
    }
}
