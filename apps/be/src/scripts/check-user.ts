import { prisma } from '../modules/prisma/prisma.service.js';

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: "agent.binda.3171" } },
    include: {
      profile: {
        include: {
          positionAssignments: {
            where: { isActive: true },
            include: { position: true },
          },
        },
      },
    },
  });

  if (!user) {
    console.log("No user found with email containing agent.binda.3171");
    return;
  }

  console.log(`User Found: ${user.name} (${user.email})`);
  const profile = user.profile;
  if (!profile) {
    console.log("No user profile found");
    return;
  }

  const assignment = profile.positionAssignments[0];
  if (!assignment) {
    console.log("No active seat assignment found");
    return;
  }

  console.log(`Active Assignment ID: ${assignment.id}`);
  console.log(`Position: ${assignment.position?.title} (${assignment.position?.code})`);

  // Count existing jaring caretaker assignments for this officer
  const count = await prisma.jaringCaretakerAssignment.count({
    where: { fieldOfficerAssignmentId: assignment.id, isActive: true },
  });
  console.log(`Active Jaring caretaker assignments count for this officer: ${count}`);
}

void checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
