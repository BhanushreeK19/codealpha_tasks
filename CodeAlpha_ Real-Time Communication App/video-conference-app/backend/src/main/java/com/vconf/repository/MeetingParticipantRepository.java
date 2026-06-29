package com.vconf.repository;

import com.vconf.entity.Meeting;
import com.vconf.entity.MeetingParticipant;
import com.vconf.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {
    Optional<MeetingParticipant> findByMeetingAndUser(Meeting meeting, User user);
    List<MeetingParticipant> findByMeetingId(Long meetingId);
    long countByMeetingIdAndLeftAtIsNull(Long meetingId);
}
