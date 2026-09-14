import { PrismaClient } from "@prisma/client";
import { stytchClient } from "../src/lib/stytch";

const prisma = new PrismaClient();

const ORG_SLUG = "bootech";
const ORG_NAME = "Bootech";
const ADMIN_EMAIL = "bootech.labs@gmail.com";

async function findOrCreateOrganization() {
  const { organizations } = await stytchClient.organizations.search({
    query: {
      operator: "AND",
      operands: [{ filter_name: "organization_slugs", filter_value: [ORG_SLUG] }],
    },
  });
  if (organizations.length > 0) return organizations[0];

  const { organization } = await stytchClient.organizations.create({
    organization_name: ORG_NAME,
    organization_slug: ORG_SLUG,
  });
  return organization;
}

async function findOrCreateAdminMember(organizationId: string) {
  const { members } = await stytchClient.organizations.members.search({
    organization_ids: [organizationId],
  });
  const existing = members.find((m) => m.email_address === ADMIN_EMAIL);
  if (existing) return existing;

  const { member } = await stytchClient.organizations.members.create({
    organization_id: organizationId,
    email_address: ADMIN_EMAIL,
    name: "Bootech Admin",
  });
  return member;
}

async function main() {
  const organization = await findOrCreateOrganization();
  console.log("Stytch organization:", organization.organization_id);

  await prisma.organization.upsert({
    where: { id: organization.organization_id },
    update: { name: organization.organization_name },
    create: { id: organization.organization_id, name: organization.organization_name },
  });

  const member = await findOrCreateAdminMember(organization.organization_id);
  console.log("Stytch member:", member.member_id);

  await prisma.user.upsert({
    where: { id: member.member_id },
    // Bootech operates the platform, so its seeded admin is also the
    // platform admin — set on every run so it's granted retroactively to
    // an already-existing row too, not just on first create.
    update: { isPlatformAdmin: true },
    create: {
      id: member.member_id,
      organizationId: organization.organization_id,
      email: ADMIN_EMAIL,
      name: "Bootech Admin",
      role: "ADMIN",
      isPlatformAdmin: true,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
