import { DataSource } from "typeorm";
import { config as dotenvConfig } from "dotenv";
import { join } from "path";

// Load environment variables
dotenvConfig({ path: ".env" });

// Source Database Configuration (from .env)
const sourceDataSource = new DataSource({
  name: "source",
  type: "mssql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "1433"),
  username: process.env.DB_USERNAME || "sa",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "testdb",
  synchronize: false,
  logging: false,
  entities: [join(__dirname, "..", "src/database/entity", "*.{ts,js}")],
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
});

// Target Database Configuration (Azure Test DB)
const targetDataSource = new DataSource({
  name: "target",
  type: "mssql",
  host: "rega-dev-db.database.windows.net",
  port: 1433,
  username: "azure-db-admin",
  password: "w@MdK.Y7PRW-iZy2.J-cH.A!2dKtVVkmbA@xWaDXUcc7k9c.H.iN9Vm9-EeG",
  database: "X_DATA",
  synchronize: false,
  logging: true,
  entities: [join(__dirname, "..", "src/database/entity", "*.{ts,js}")],
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
});

interface MigrationStats {
  users: number;
  posts: number;
  mentions: number;
  countries: number;
}

const stats: MigrationStats = {
  users: 0,
  posts: 0,
  mentions: 0,
  countries: 0,
};

async function clearTargetDatabase() {
  console.log("\n🧹 Clearing target database tables...");

  // Delete in order respecting foreign key constraints
  // mentions -> posts -> users -> countries
  try {
    await targetDataSource.query(`DELETE FROM mentions`);
    console.log("✅ Cleared mentions");
  } catch (error) {
    console.log("⚠️  No mentions to clear or table doesn't exist");
  }

  try {
    await targetDataSource.query(`DELETE FROM post`);
    console.log("✅ Cleared posts");
  } catch (error) {
    console.log("⚠️  No posts to clear or table doesn't exist");
  }

  try {
    await targetDataSource.query(`DELETE FROM [user]`);
    console.log("✅ Cleared users");
  } catch (error) {
    console.log("⚠️  No users to clear or table doesn't exist");
  }

  try {
    await targetDataSource.query(`DELETE FROM countries_lookup`);
    console.log("✅ Cleared countries");
  } catch (error) {
    console.log("⚠️  No countries to clear or table doesn't exist");
  }

  console.log("🧹 Database cleared successfully\n");
}

async function migrateCountries() {
  console.log("\n🌍 Migrating countries_lookup table...");

  const sourceQuery = `SELECT * FROM countries_lookup`;
  const countries = await sourceDataSource.query(sourceQuery);

  console.log(`Found ${countries.length} countries in source database`);

  if (countries.length === 0) {
    console.log("No countries to migrate");
    return;
  }

  // Batch insert countries (using bulk insert per batch for efficiency)
  const batchSize = 100;
  for (let i = 0; i < countries.length; i += batchSize) {
    const batch = countries.slice(i, i + batchSize);

    // Use bulk insert for countries (more efficient than parallel individual inserts)
    const values = batch
      .map(
        (c: any) =>
          `(${c.id}, N'${c.english_name.replace(/'/g, "''")}', N'${c.arabic_name.replace(/'/g, "''")}', N'${c.iso3}', N'${c.iso2}')`,
      )
      .join(",\n");

    const insertQuery = `
      INSERT INTO countries_lookup (id, english_name, arabic_name, iso3, iso2)
      VALUES ${values};
    `;

    await targetDataSource.query(insertQuery);
    stats.countries += batch.length;
    console.log(`Migrated ${stats.countries}/${countries.length} countries`);
  }

  console.log(`✅ Countries migration complete: ${stats.countries} countries`);
}

async function migrateUsers(limit: number = 500) {
  console.log(`\n👥 Migrating ${limit} users...`);

  // Get users with the most posts (to ensure we have rich test data)
  const usersQuery = `
    SELECT TOP ${limit} u.*
    FROM [user] u
    LEFT JOIN post p ON u.user_id = p.user_id
    GROUP BY u.id, u.user_id, u.username, u.name, u.description, u.profile_image_url,
             u.followers_count, u.following_count, u.tweet_count, u.listed_count,
             u.like_count, u.media_count, u.is_verified, u.verified_type,
             u.pinned_tweet_id, u.created_at, u.updated_at, u.user_created_at
    ORDER BY COUNT(p.id) DESC
  `;

  const users = await sourceDataSource.query(usersQuery);
  console.log(`Found ${users.length} users in source database`);

  if (users.length === 0) {
    console.log("No users to migrate");
    return [];
  }

  // Batch insert users in parallel
  const batchSize = 50;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    // Insert all users in the batch in parallel
    await Promise.all(
      batch.map(async (user: any) => {
        const insertQuery = `
          SET IDENTITY_INSERT [user] ON;
          INSERT INTO [user] (
            id, user_id, username, name, description, profile_image_url,
            followers_count, following_count, tweet_count, listed_count,
            like_count, media_count, is_verified, verified_type,
            pinned_tweet_id, created_at, updated_at, user_created_at
          ) VALUES (
            ${user.id},
            ${user.user_id},
            ${user.username ? `'${user.username.replace(/'/g, "''")}'` : "NULL"},
            ${user.name ? `N'${user.name.replace(/'/g, "''")}'` : "NULL"},
            ${user.description ? `N'${user.description.replace(/'/g, "''")}'` : "NULL"},
            ${user.profile_image_url ? `'${user.profile_image_url.replace(/'/g, "''")}'` : "NULL"},
            ${user.followers_count || "NULL"},
            ${user.following_count || "NULL"},
            ${user.tweet_count || "NULL"},
            ${user.listed_count || "NULL"},
            ${user.like_count || "NULL"},
            ${user.media_count || "NULL"},
            ${user.is_verified !== null ? (user.is_verified ? 1 : 0) : "NULL"},
            ${user.verified_type ? `'${user.verified_type.replace(/'/g, "''")}'` : "NULL"},
            ${user.pinned_tweet_id || "NULL"},
            ${user.created_at ? `'${new Date(user.created_at).toISOString()}'` : "NULL"},
            ${user.updated_at ? `'${new Date(user.updated_at).toISOString()}'` : "NULL"},
            ${user.user_created_at ? `'${new Date(user.user_created_at).toISOString()}'` : "NULL"}
          );
          SET IDENTITY_INSERT [user] OFF;
        `;

        await targetDataSource.query(insertQuery);
        stats.users++;
      }),
    );

    console.log(`Migrated ${stats.users}/${users.length} users`);
  }

  console.log(`✅ Users migration complete: ${stats.users} users`);
  return users.map((u: any) => u.user_id);
}

async function migratePosts(userIds: string[]) {
  console.log("\n📝 Migrating posts...");

  if (userIds.length === 0) {
    console.log("No users to migrate posts for");
    return;
  }

  const userIdsList = userIds.join(",");
  const postsQuery = `
    SELECT * FROM post
    WHERE user_id IN (${userIdsList})
    ORDER BY posted_at DESC
  `;

  const posts = await sourceDataSource.query(postsQuery);
  console.log(`Found ${posts.length} posts for migrated users`);

  if (posts.length === 0) {
    console.log("No posts to migrate");
    return [];
  }

  // Create a Set of migrated user IDs for fast lookup
  const migratedUserIds = new Set(userIds.map((id) => String(id)));

  // Batch insert posts in parallel
  const batchSize = 100;
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    // Insert all posts in the batch in parallel
    await Promise.all(
      batch.map(async (post: any) => {
        // If reply_to_user_id references a user not in our migrated set, set it to NULL
        const replyToUserId =
          post.reply_to_user_id && migratedUserIds.has(String(post.reply_to_user_id))
            ? post.reply_to_user_id
            : null;

        const insertQuery = `
          SET IDENTITY_INSERT post ON;
          INSERT INTO post (
            id, conversation_id, post_id, user_id, username, name, lang,
            sentiment, country, possibly_sensitive, text, like_count,
            reply_count, retweet_count, bookmark_count, quote_count,
            impression_count, post_type, referenced_tweet_id, reply_to_user_id,
            reply_to_username, posted_at, created_at, updated_at
          ) VALUES (
            ${post.id},
            ${post.conversation_id || "NULL"},
            ${post.post_id},
            ${post.user_id},
            ${post.username ? `'${post.username.replace(/'/g, "''")}'` : "NULL"},
            ${post.name ? `N'${post.name.replace(/'/g, "''")}'` : "NULL"},
            ${post.lang ? `'${post.lang.replace(/'/g, "''")}'` : "NULL"},
            ${post.sentiment ? `'${post.sentiment.replace(/'/g, "''")}'` : "NULL"},
            ${post.country ? `'${post.country.replace(/'/g, "''")}'` : "NULL"},
            ${post.possibly_sensitive !== null ? (post.possibly_sensitive ? 1 : 0) : "NULL"},
            ${post.text ? `N'${post.text.replace(/'/g, "''")}'` : "NULL"},
            ${post.like_count || "NULL"},
            ${post.reply_count || "NULL"},
            ${post.retweet_count || "NULL"},
            ${post.bookmark_count || "NULL"},
            ${post.quote_count || "NULL"},
            ${post.impression_count || "NULL"},
            ${post.post_type ? `'${post.post_type.replace(/'/g, "''")}'` : "NULL"},
            ${post.referenced_tweet_id || "NULL"},
            ${replyToUserId || "NULL"},
            ${post.reply_to_username ? `'${post.reply_to_username.replace(/'/g, "''")}'` : "NULL"},
            ${post.posted_at ? `'${new Date(post.posted_at).toISOString()}'` : "NULL"},
            ${post.created_at ? `'${new Date(post.created_at).toISOString()}'` : "NULL"},
            ${post.updated_at ? `'${new Date(post.updated_at).toISOString()}'` : "NULL"}
          );
          SET IDENTITY_INSERT post OFF;
        `;

        await targetDataSource.query(insertQuery);
        stats.posts++;
      }),
    );

    console.log(`Migrated ${stats.posts}/${posts.length} posts`);
  }

  console.log(`✅ Posts migration complete: ${stats.posts} posts`);
  return posts.map((p: any) => p.post_id);
}

async function migrateMentions(postIds: string[]) {
  console.log("\n🔗 Migrating mentions...");

  if (postIds.length === 0) {
    console.log("No posts to migrate mentions for");
    return;
  }

  const postIdsList = postIds.join(",");
  const mentionsQuery = `
    SELECT * FROM mentions
    WHERE post_id IN (${postIdsList})
  `;

  const mentions = await sourceDataSource.query(mentionsQuery);
  console.log(`Found ${mentions.length} mentions for migrated posts`);

  if (mentions.length === 0) {
    console.log("No mentions to migrate");
    return;
  }

  // Batch insert mentions in parallel
  const batchSize = 100;
  for (let i = 0; i < mentions.length; i += batchSize) {
    const batch = mentions.slice(i, i + batchSize);

    // Insert all mentions in the batch in parallel
    await Promise.all(
      batch.map(async (mention: any) => {
        const insertQuery = `
          SET IDENTITY_INSERT mentions ON;
          INSERT INTO mentions (id, post_id, user_id)
          VALUES (${mention.id}, ${mention.post_id}, ${mention.user_id});
          SET IDENTITY_INSERT mentions OFF;
        `;

        try {
          await targetDataSource.query(insertQuery);
          stats.mentions++;
        } catch (error: any) {
          // Skip if user doesn't exist (mention to user not in our 500)
          if (!error.message.includes("FOREIGN KEY")) {
            throw error;
          }
        }
      }),
    );

    console.log(`Migrated ${stats.mentions}/${mentions.length} mentions`);
  }

  console.log(`✅ Mentions migration complete: ${stats.mentions} mentions`);
}

async function resetIdentityColumns() {
  console.log("\n🔧 Resetting identity columns...");

  // Reset identity seed values to continue from max values
  // Note: countries_lookup doesn't have identity column, so it's excluded
  const tables = ["user", "post", "mentions"];

  for (const table of tables) {
    try {
      await targetDataSource.query(`
        DECLARE @max bigint = (SELECT ISNULL(MAX(id), 0) FROM [${table}]);
        DBCC CHECKIDENT ('[${table}]', RESEED, @max);
      `);
      console.log(`✅ Reset identity for table: ${table}`);
    } catch (error) {
      console.log(`⚠️  Could not reset identity for ${table}:`, error);
    }
  }
}

async function verifyMigration() {
  console.log("\n✅ Verifying migration...");

  const userCount = await targetDataSource.query("SELECT COUNT(*) as count FROM [user]");
  const postCount = await targetDataSource.query("SELECT COUNT(*) as count FROM post");
  const mentionsCount = await targetDataSource.query("SELECT COUNT(*) as count FROM mentions");
  const countriesCount = await targetDataSource.query(
    "SELECT COUNT(*) as count FROM countries_lookup",
  );

  console.log("\n📊 Migration Summary:");
  console.log("════════════════════════════════════════");
  console.log(`Countries: ${countriesCount[0].count}`);
  console.log(`Users:     ${userCount[0].count}`);
  console.log(`Posts:     ${postCount[0].count}`);
  console.log(`Mentions:  ${mentionsCount[0].count}`);
  console.log("════════════════════════════════════════");
  console.log(
    `✨ Total migrated: ${stats.countries + stats.users + stats.posts + stats.mentions} records`,
  );
}

async function main() {
  console.log("🚀 Starting data migration...");
  console.log("════════════════════════════════════════");
  console.log("Source DB:", process.env.DB_HOST, "/", process.env.DB_NAME);
  console.log("Target DB: rega-dev-db.database.windows.net / X_DATA");
  console.log("════════════════════════════════════════\n");

  try {
    // Connect to both databases
    console.log("🔌 Connecting to source database...");
    await sourceDataSource.initialize();
    console.log("✅ Source database connected");

    console.log("🔌 Connecting to target database...");
    await targetDataSource.initialize();
    console.log("✅ Target database connected");

    // Clear target database first (in correct order)
    await clearTargetDatabase();

    // Perform migration in order (respecting foreign keys)
    await migrateCountries();
    const userIds = await migrateUsers(500);
    const postIds = await migratePosts(userIds);
    await migrateMentions(postIds);
    await resetIdentityColumns();
    await verifyMigration();

    console.log("\n✨ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close connections
    if (sourceDataSource.isInitialized) {
      await sourceDataSource.destroy();
      console.log("\n👋 Source database connection closed");
    }
    if (targetDataSource.isInitialized) {
      await targetDataSource.destroy();
      console.log("👋 Target database connection closed");
    }
  }
}

// Run migration
main();
