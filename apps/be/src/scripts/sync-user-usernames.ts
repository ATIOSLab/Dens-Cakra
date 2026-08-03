import { prisma } from '../modules/prisma/prisma.service.js';

async function syncUserUsernames() {
  console.log('Starting sync of User.username from UserProfile.username...');

  const profiles = await prisma.userProfile.findMany({
    where: {
      username: { not: null },
    },
    select: {
      authUserId: true,
      username: true,
    },
  });

  let updatedCount = 0;
  for (const profile of profiles) {
    if (!profile.username) continue;

    await prisma.user.updateMany({
      where: {
        id: profile.authUserId,
        OR: [
          { username: null },
          { username: { not: profile.username } },
        ],
      },
      data: {
        username: profile.username,
        displayUsername: profile.username,
      },
    });

    updatedCount++;
  }

  console.log(`Successfully synced ${updatedCount} user accounts with their respective usernames.`);
}

void syncUserUsernames()
  .catch((error: unknown) => {
    console.error('Failed to sync user usernames:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
