package com.vconf.repository;

import com.vconf.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {
    Optional<Meeting> findByMeetingCode(String meetingCode);
    boolean existsByMeetingCode(String meetingCode);

    List<Meeting> findByHostIdOrderByCreatedAtDesc(Long hostId);

    @org.springframework.data.jpa.repository.Query(
        "select m from Meeting m join m.participants p where p.user.id = :userId order by m.createdAt desc"
    )
    List<Meeting> findMeetingsForParticipant(Long userId);
}
