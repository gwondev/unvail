

package com.example.unvail.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users") // MySQL의 users 테이블과 매핑됩니다.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // 기본키 (자동 증가)

    @Column(nullable = false, unique = true, length = 64)
    private String googleSub;

    @Column(length = 255)
    private String email;

    @Column(nullable = false, unique = true, length = 20)
    private String nickname;

    @Builder.Default
    @Column(nullable = false)
    private Integer geminiRemainingCalls = 20;

    @Column(name = "created_at", updatable = false)
    private java.time.LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = java.time.LocalDateTime.now();
    }
}