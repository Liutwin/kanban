package com.repositories;

import com.entities.ResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ResetTokenRepository extends JpaRepository<ResetToken, Long> {

    Optional<ResetToken> findByToken(String token);

    void deleteByUserId(Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ResetToken r WHERE r.expiry < :now")
    void deleteAllExpired(@Param("now") LocalDateTime now);
}