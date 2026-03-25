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

    @Column(nullable = false, unique = true, length = 50)
    private String email; // 사장님이 리액트에서 만든 '아이디(이메일)' 필드

    @Column(nullable = false, length = 100)
    private String password; // 비밀번호 (나중에 암호화해서 저장할 거예요)

    @Column(nullable = false, length = 20)
    private String name; // 사장님이 리액트에서 만든 '이름' 필드

    @Builder.Default
    private Integer point = 0; // 가입 시 기본 0포인트 (나중에 리뷰 쓰면 500원씩!)

    @Column(name = "created_at", updatable = false)
    private java.time.LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = java.time.LocalDateTime.now();
    }
}