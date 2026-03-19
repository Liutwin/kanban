package com.scheduled;

import com.repositories.ResetTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class TokenCleanupScheduler {

    private final ResetTokenRepository resetTokenRepository;

    /**
     * Supprime les tokens de reset expirés toutes les heures.
     * fixedRate en millisecondes : 3 600 000 = 1 heure.
     */
    @Scheduled(fixedRate = 3_600_000)
    public void purgeExpiredTokens() {
        resetTokenRepository.deleteAllExpired(LocalDateTime.now());
        log.info("[Scheduler] Tokens de reset expirés supprimés");
    }
}