package com.airline.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;

@Configuration
@Profile("e2e")
public class E2eAsyncConfig {

    @Bean(name = "taskExecutor")
    TaskExecutor taskExecutor() {
        return new SyncTaskExecutor();
    }
}
