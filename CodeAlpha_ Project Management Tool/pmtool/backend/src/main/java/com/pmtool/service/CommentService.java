package com.pmtool.service;

import com.pmtool.dto.request.CommentCreateRequest;
import com.pmtool.dto.response.CommentResponse;
import com.pmtool.entity.Comment;
import com.pmtool.entity.Task;
import com.pmtool.entity.User;
import com.pmtool.enums.NotificationType;
import com.pmtool.exception.ResourceNotFoundException;
import com.pmtool.repository.CommentRepository;
import com.pmtool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final TaskService taskService;
    private final ProjectService projectService;
    private final NotificationService notificationService;
    private final ActivityService activityService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public CommentResponse addComment(Long taskId, CommentCreateRequest request, Long authorId) {
        Task task = taskService.getTaskOrThrow(taskId);
        projectService.ensureMember(task.getProject().getId(), authorId);

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Comment comment = Comment.builder()
                .task(task)
                .author(author)
                .content(request.getContent())
                .build();
        comment = commentRepository.save(comment);

        activityService.log(task.getProject(), author, "commented on " + task.getTaskCode(), task.getId());

        // Notify the assignee (if someone other than the commenter) that a new comment was posted
        if (task.getAssignee() != null) {
            notificationService.notify(task.getAssignee(), author, NotificationType.NEW_COMMENT,
                    author.getFullName() + " commented on \"" + task.getTitle() + "\"", task.getId(), task.getProject().getId());
        }
        // Also notify the reporter if different from assignee and commenter
        if (task.getReporter() != null
                && (task.getAssignee() == null || !task.getReporter().getId().equals(task.getAssignee().getId()))) {
            notificationService.notify(task.getReporter(), author, NotificationType.NEW_COMMENT,
                    author.getFullName() + " commented on \"" + task.getTitle() + "\"", task.getId(), task.getProject().getId());
        }

        // Resolve and notify @mentions
        if (request.getMentionedUsernames() != null) {
            for (String username : request.getMentionedUsernames()) {
                Optional<User> mentioned = userRepository.findByUsername(username);
                mentioned.ifPresent(user -> notificationService.notify(user, author, NotificationType.MENTION,
                        author.getFullName() + " mentioned you in \"" + task.getTitle() + "\"", task.getId(), task.getProject().getId()));
            }
        }

        CommentResponse response = CommentResponse.from(comment);
        // Live comment push to anyone viewing this task's discussion thread
        messagingTemplate.convertAndSend("/topic/tasks/" + taskId + "/comments", response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(Long taskId, Long userId) {
        Task task = taskService.getTaskOrThrow(taskId);
        projectService.ensureMember(task.getProject().getId(), userId);
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(CommentResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new com.pmtool.exception.AccessDeniedCustomException("You can only delete your own comments");
        }
        commentRepository.delete(comment);
    }
}
