package com.airline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class GhClearingApplication {
    public static void main(String[] args) {
        SpringApplication.run(GhClearingApplication.class, args);
    }
}
