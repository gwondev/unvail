package com.example.unvail.repository; // 1. 폴더 주소 확인

import com.example.unvail.entity.User; // 2. User 엔티티 가져오기
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}