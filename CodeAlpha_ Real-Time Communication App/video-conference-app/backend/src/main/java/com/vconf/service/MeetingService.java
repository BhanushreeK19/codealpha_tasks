package com.vconf.service;

import com.vconf.dto.MeetingRequest;
import com.vconf.dto.MeetingResponse;
import com.vconf.entity.Meeting;
import com.vconf.entity.MeetingParticipant;
import com.vconf.entity.User;
import com.vconf.exception.BadRequestException;
import com.vconf.exception.ResourceNotFoundException;
import com.vconf.repository.MeetingParticipantRepository;
import com.vconf.repository.MeetingRepository;
import com.vconf.util.MeetingCodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingParticipantRepository participantRepository;
    private final UserService userService;

    @Transactional
    public MeetingResponse createMeeting(MeetingRequest request) {
        User host = userService.getCurrentUser();

        String code;
        do {
            code = MeetingCodeGenerator.generate();
        } while (meetingRepository.existsByMeetingCode(code));

        Meeting meeting = Meeting.builder()
                .meetingCode(code)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .host(host)
                .scheduledAt(request.getScheduledAt())
                .waitingRoomEnabled(request.isWaitingRoomEnabled())
                .status(Meeting.MeetingStatus.SCHEDULED)
                .build();

        meeting = meetingRepository.save(meeting);

        // Host is automatically registered as a participant with HOST role.
        MeetingParticipant hostParticipant = MeetingParticipant.builder()
                .meeting(meeting)
                .user(host)
                .role(MeetingParticipant.ParticipantRole.HOST)
                .build();
        participantRepository.save(hostParticipant);

        return toResponse(meeting);
    }

    @Transactional
    public MeetingResponse joinMeeting(String meetingCode) {
        User user = userService.getCurrentUser();
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("No meeting found with code: " + meetingCode));

        if (meeting.getStatus() == Meeting.MeetingStatus.ENDED) {
            throw new BadRequestException("This meeting has already ended");
        }

        MeetingParticipant participant = participantRepository.findByMeetingAndUser(meeting, user)
                .orElseGet(() -> MeetingParticipant.builder()
                        .meeting(meeting)
                        .user(user)
                        .role(MeetingParticipant.ParticipantRole.PARTICIPANT)
                        .build());

        participant.setJoinedAt(LocalDateTime.now());
        participant.setLeftAt(null);
        participantRepository.save(participant);

        if (meeting.getStatus() == Meeting.MeetingStatus.SCHEDULED) {
            meeting.setStatus(Meeting.MeetingStatus.ACTIVE);
            meeting.setStartedAt(LocalDateTime.now());
            meetingRepository.save(meeting);
        }

        return toResponse(meeting);
    }

    @Transactional
    public void leaveMeeting(String meetingCode) {
        User user = userService.getCurrentUser();
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("No meeting found with code: " + meetingCode));

        MeetingParticipant participant = participantRepository.findByMeetingAndUser(meeting, user)
                .orElseThrow(() -> new BadRequestException("You are not part of this meeting"));

        participant.setLeftAt(LocalDateTime.now());
        participantRepository.save(participant);

        long stillActive = participantRepository.countByMeetingIdAndLeftAtIsNull(meeting.getId());
        if (stillActive == 0) {
            meeting.setStatus(Meeting.MeetingStatus.ENDED);
            meeting.setEndedAt(LocalDateTime.now());
            meetingRepository.save(meeting);
        }
    }

    @Transactional
    public void endMeeting(String meetingCode) {
        User user = userService.getCurrentUser();
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("No meeting found with code: " + meetingCode));

        if (!meeting.getHost().getId().equals(user.getId())) {
            throw new BadRequestException("Only the host can end this meeting");
        }

        meeting.setStatus(Meeting.MeetingStatus.ENDED);
        meeting.setEndedAt(LocalDateTime.now());
        meetingRepository.save(meeting);
    }

    @Transactional(readOnly = true)
    public MeetingResponse getByCode(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("No meeting found with code: " + meetingCode));
        return toResponse(meeting);
    }

    /** Meeting history / dashboard: every meeting the user hosted or attended. */
    @Transactional(readOnly = true)
    public List<MeetingResponse> getMeetingHistory() {
        User user = userService.getCurrentUser();
        return meetingRepository.findMeetingsForParticipant(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MeetingResponse> getMeetingsHostedByCurrentUser() {
        User user = userService.getCurrentUser();
        return meetingRepository.findByHostIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private MeetingResponse toResponse(Meeting meeting) {
        long activeCount = participantRepository.countByMeetingIdAndLeftAtIsNull(meeting.getId());
        return MeetingResponse.builder()
                .id(meeting.getId())
                .meetingCode(meeting.getMeetingCode())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .status(meeting.getStatus().name())
                .host(AuthService.toProfileDto(meeting.getHost()))
                .scheduledAt(meeting.getScheduledAt())
                .startedAt(meeting.getStartedAt())
                .endedAt(meeting.getEndedAt())
                .createdAt(meeting.getCreatedAt())
                .waitingRoomEnabled(meeting.isWaitingRoomEnabled())
                .activeParticipantCount(activeCount)
                .build();
    }
}
