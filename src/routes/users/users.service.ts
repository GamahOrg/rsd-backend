import fp from "fastify-plugin";
import { TResponse as GetUsersResponse } from "./schemas/getUsernames.schema";
import { TResponse as GetUserResponse } from "./schemas/getUser.schema";
import { XDataSource } from "../../config/database";
import { User } from "../../database/entity/User.entity";

export default fp(async (fastify) => {
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
    getUsernamesByUsername,
    getUser,
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
      getUser: (user_id: string) => Promise<{ data: GetUserResponse }>;
    };
  }
}
