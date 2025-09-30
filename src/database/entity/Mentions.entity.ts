import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Post } from './Post.entity';
import { User } from './User.entity';

@Entity({ name: 'mentions' })
export class Mentions extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id!: number;

    @Column({ type: 'bigint', nullable: true })
    post_id?: number;

    @Column({ type: 'bigint', nullable: true })
    user_id?: number;

    @ManyToOne(() => Post, post => post.id)
    @JoinColumn({ name: 'post_id' })
    post?: Post;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'user_id' })
    user?: User;
}
