package com.bms.repository;

import com.bms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByResetToken(String resetToken);
    Optional<User> findByAccountNumber(String accountNumber);
} 