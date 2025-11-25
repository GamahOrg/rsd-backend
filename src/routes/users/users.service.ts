import fp from "fastify-plugin";
import { TResponse as GetUsersResponse } from "./schemas/getUsernames.schema";
import { TResponse as GetUserResponse } from "./schemas/getUser.schema";
import { XDataSource } from "../../config/database";
import { User } from "../../database/entity/User.entity";
import { TResponse as GetAllUsersResponse } from "./schemas/getAllUsers.schema";

export default fp(async (fastify) => {
  const getAllUsers = async (
    search: string | undefined,
    order_by: { field: string; direction: "asc" | "desc" },
    skip: number,
    take: number,
  ) => {
    const userRepo = XDataSource.getRepository(User);
    const qb = userRepo.createQueryBuilder("user").select("*");
    qb.where(
      "user.tweet_count IS NOT NULL AND user.tweet_count > 0 and user.like_count IS NOT NULL AND user.like_count > 0",
    );
    if (search) {
      qb.where("user.username LIKE :search", { search: `${search}%` });
    }
    if (order_by) {
      const direction = order_by.direction.toLowerCase() === "asc" ? "ASC" : "DESC";
      qb.orderBy(`user.${order_by.field}`, direction);
    }
    const totalRecords = await qb.getCount();
    const data = await qb.skip(skip).take(take).getRawMany();
    return { data: data as unknown as GetAllUsersResponse, totalRecords };
  };

  const getUsernamesByUsername = async (username: string, skip: number, take: number) => {
    const userRepo = XDataSource.getRepository(User);

    const qb = userRepo
      .createQueryBuilder("user")
      .select("user.user_id", "id")
      .addSelect("user.username", "value")
      .where("user.username LIKE :username", { username: `${username}%` })
      .orderBy("user.username", "ASC");

    const totalRecords = await qb.getCount();
    const data = await qb.skip(skip).take(take).getRawMany();

    return { data: data as unknown as GetUsersResponse, totalRecords };
  };

  const getUser = async (user_id: string) => {
    const userRepo = XDataSource.getRepository(User);
    const data = await userRepo.findOne({ where: { user_id } });
    return { data: data as unknown as GetUserResponse };
  };

  // Decorate the fastify instance with the userService
  fastify.decorate("userService", {
    getAllUsers,
    getUsernamesByUsername,
    getUser,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    userService: {
      getAllUsers: (
        search: string | undefined,

        order_by: { field: string; direction: "asc" | "desc" },
        skip: number,
        take: number,
      ) => Promise<{ data: GetAllUsersResponse; totalRecords: number }>;
      getUsernamesByUsername: (
        username: string,
        skip: number,
        take: number,
      ) => Promise<{ data: GetUsersResponse; totalRecords: number }>;
      getUser: (user_id: string) => Promise<{ data: GetUserResponse }>;
    };
  }
}
