import fp from "fastify-plugin";
import { TResponse as GetUsersResponse } from "./schemas/getUsers.schema";
import { AppDataSource } from "../../config/database";
import { User } from "../../database/entity/User.entity";

export default fp(async (fastify) => {
  const getUsernamesByUsername = async (username: string, skip: number, take: number) => {
    const userRepo = AppDataSource.getRepository(User);

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

  // Decorate the fastify instance with the userService
  fastify.decorate("userService", {
    getUsernamesByUsername,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    userService: {
      getUsernamesByUsername: (
        username: string,
        skip: number,
        take: number,
      ) => Promise<{ data: GetUsersResponse; totalRecords: number }>;
    };
  }
}
