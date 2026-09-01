import React from "react";
import { List } from "@mui/material";

import NotificationListItem from "./NotificationListItem";
import { NotificationResponseItem } from "../models";
import EmptyList from "./EmptyList";
import ErrorState from "./ErrorState";
import RemindersIllustration from "./SvgUndrawReminders697P";

export interface NotificationsListProps {
  notifications: NotificationResponseItem[];
  updateNotification: Function;
  /** La machine est en `failure` : sans cela, une panne se rendait « No Notifications ». */
  hasError?: Boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  updateNotification,
  hasError,
  errorMessage,
  onRetry,
}) => {
  if (hasError) {
    return <ErrorState entity="notifications" message={errorMessage} onRetry={onRetry} />;
  }
  return (
    <>
      {notifications?.length > 0 ? (
        <List data-test="notifications-list">
          {notifications.map((notification: NotificationResponseItem) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              updateNotification={updateNotification}
            />
          ))}
        </List>
      ) : (
        <EmptyList entity="Notifications">
          <RemindersIllustration style={{ height: 200, width: 250, marginBottom: 30 }} />
        </EmptyList>
      )}
    </>
  );
};

export default NotificationsList;
