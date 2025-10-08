-- create the DB for the RSD backend
create database X_DATA
go

-- use the DB
use X_DATA
go

create table countries_lookup
(
    id           int           not null
        primary key,
    english_name nvarchar(100) not null,
    arabic_name  nvarchar(100) not null,
    iso3         nvarchar(3)   not null,
    iso2         nvarchar(2)   not null
)
go

create table post_json
(
    id              bigint identity
        primary key,
    conversation_id bigint,
    post_id         bigint,
    post_json       nvarchar(max),
    posted_at       datetime,
    is_processed    bit,
    synced_at       datetime
)
go

create index idx_postjson_processed
    on post_json (is_processed)
go

create index idx_postjson_post_id
    on post_json (post_id)
go

create table [user]
(
    id                bigint identity
        primary key,
    user_id           bigint not null
        unique,
    username          varchar(255),
    name              nvarchar(255),
    description       nvarchar(max),
    profile_image_url varchar(max),
    followers_count   int,
    following_count   int,
    tweet_count       int,
    listed_count      int,
    like_count        int,
    media_count       int,
    is_verified       bit,
    verified_type     varchar(255),
    pinned_tweet_id   bigint,
    created_at        datetime,
    updated_at        datetime,
    user_created_at   datetime
)
go

create table post
(
    id                  bigint identity
        primary key,
    conversation_id     bigint,
    post_id             bigint not null
        unique,
    user_id             bigint not null
        constraint fk_post_user
            references [user] (user_id),
    username            varchar(255),
    name                nvarchar(255),
    lang                varchar(10),
    sentiment           varchar(50),
    country             varchar(50),
    possibly_sensitive  bit,
    text                nvarchar(max),
    like_count          int,
    reply_count         int,
    retweet_count       int,
    bookmark_count      int,
    quote_count         int,
    impression_count    int,
    post_type           varchar(50),
    referenced_tweet_id bigint,
    reply_to_user_id    bigint
        constraint fk_post_reply_to_user
            references [user] (user_id),
    reply_to_username   varchar(255),
    posted_at           datetimeoffset,
    created_at          datetimeoffset,
    updated_at          datetimeoffset
)
go

create table mentions
(
    id      bigint identity
        primary key,
    post_id bigint not null
        constraint fk_mentions_post
            references post (post_id)
            on delete cascade,
    user_id bigint not null
        constraint fk_mentions_user
            references [user] (user_id)
            on delete cascade,
    constraint uq_mentions
        unique (post_id, user_id)
)
go

create index IX_mentions_composite
    on mentions (post_id, user_id)
go

create index IX_mentions_user_id
    on mentions (user_id)
go

create index IX_post_post_id
    on post (post_id)
go

create index IX_post_user_id
    on post (user_id)
go

create index IX_post_posted_at
    on post (posted_at)
go

create index IX_post_conversation_id
    on post (conversation_id)
go

create index IX_post_reply_to_user_id
    on post (reply_to_user_id)
go

create index IX_user_user_id
    on [user] (user_id)
go

