import { useNotifications } from '../services/NotificationContext';

export class NotificationUtils {
  private static notifications = useNotifications();

  static scheduleTaskReminder(taskId: string, taskTitle: string, dueDate: Date) {
    const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    const now = new Date();

    if (reminderTime > now) {
      this.notifications.scheduleNotification({
        id: `task-reminder-${taskId}`,
        title: 'Task Due Soon',
        message: `Task "${taskTitle}" is due tomorrow`,
        date: reminderTime,
        userInfo: { type: 'task', taskId },
      });
    }

    // Schedule final reminder 1 hour before
    const finalReminder = new Date(dueDate.getTime() - 60 * 60 * 1000);
    if (finalReminder > now) {
      this.notifications.scheduleNotification({
        id: `task-final-${taskId}`,
        title: 'Task Due Soon',
        message: `Task "${taskTitle}" is due in 1 hour`,
        date: finalReminder,
        userInfo: { type: 'task', taskId },
      });
    }
  }

  static scheduleDeadlineReminder(taskId: string, taskTitle: string, deadline: Date) {
    const reminderTimes = [
      { days: 7, message: 'due in 1 week' },
      { days: 3, message: 'due in 3 days' },
      { days: 1, message: 'due tomorrow' },
      { hours: 1, message: 'due in 1 hour' },
    ];

    const now = new Date();

    reminderTimes.forEach((reminder, index) => {
      let reminderTime: Date;
      
      if (reminder.days) {
        reminderTime = new Date(deadline.getTime() - reminder.days * 24 * 60 * 60 * 1000);
      } else if (reminder.hours) {
        reminderTime = new Date(deadline.getTime() - reminder.hours * 60 * 60 * 1000);
      } else {
        return;
      }

      if (reminderTime > now) {
        this.notifications.scheduleNotification({
          id: `deadline-${taskId}-${index}`,
          title: 'Deadline Reminder',
          message: `Task "${taskTitle}" ${reminder.message}`,
          date: reminderTime,
          userInfo: { type: 'deadline', taskId },
        });
      }
    });
  }

  static scheduleStudyReminder(courseId: string, courseTitle: string, studyTime: Date) {
    this.notifications.scheduleNotification({
      id: `study-${courseId}`,
      title: 'Study Reminder',
      message: `Time to study "${courseTitle}"`,
      date: studyTime,
      userInfo: { type: 'study', courseId },
    });
  }

  static cancelTaskNotifications(taskId: string) {
    this.notifications.cancelNotification(`task-reminder-${taskId}`);
    this.notifications.cancelNotification(`task-final-${taskId}`);
    
    // Cancel deadline notifications
    for (let i = 0; i < 4; i++) {
      this.notifications.cancelNotification(`deadline-${taskId}-${i}`);
    }
  }

  static showTaskCompletedNotification(taskTitle: string) {
    this.notifications.showLocalNotification(
      'Task Completed! 🎉',
      `Great job! You completed "${taskTitle}"`
    );
  }

  static showTimeTrackingReminder() {
    this.notifications.showLocalNotification(
      'Time Tracking Reminder',
      'Don\'t forget to track your time on current tasks'
    );
  }

  static showDailySummaryNotification(completedTasks: number, totalHours: number) {
    this.notifications.showLocalNotification(
      'Daily Summary 📊',
      `Completed ${completedTasks} tasks, tracked ${totalHours.toFixed(1)} hours today`
    );
  }
}
