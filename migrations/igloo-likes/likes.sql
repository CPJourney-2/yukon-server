create table igloo_likes
(
    userID  int default 1 not null,
    likerID int default 1 not null,
    slotID  int default 0 not null,
    constraint userID_pk
        primary key (userID, likerID, slotID),
    constraint userID_fk
        foreign key (userID) references users (id)
            on update cascade on delete cascade
);

alter table igloo_likes
    add constraint likerID
        foreign key (likerID) references users (id);

alter table igloo_likes
    add createdAt datetime default CURRENT_TIMESTAMP() not null;

alter table igloo_likes
    drop foreign key likerID;
