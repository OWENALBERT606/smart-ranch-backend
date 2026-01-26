import { Request, Response } from "express";
import { db } from "@/db/db";
import { MemberStatus } from "@prisma/client";

/**
 * Get current user's pending farm invitations
 * GET /api/v1/users/invitations
 */
export async function getUserInvitations(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Get all pending farm invitations for this user
    const invitations = await db.farmMember.findMany({
      where: {
        userId,
        status: MemberStatus.PENDING,
      },
      include: {
        farm: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        invitedAt: 'desc',
      },
    });

    // Format response
    const formattedInvitations = invitations.map((invitation) => ({
      id: invitation.id,
      farmId: invitation.farmId,
      userId: invitation.userId,
      role: invitation.role,
      permissions: invitation.permissions,
      specialty: invitation.specialty,
      status: invitation.status,
      invitedAt: invitation.invitedAt,
      farm: {
        id: invitation.farm.id,
        name: invitation.farm.name,
        description: invitation.farm.description,
        district: invitation.farm.district,
        city: invitation.farm.city,
        farmType: invitation.farm.farmType,
        totalAnimals: invitation.farm.totalAnimals,
        owner: {
          name: invitation.farm.owner.name,
          email: invitation.farm.owner.email,
        },
      },
    }));

    return res.status(200).json({
      success: true,
      data: formattedInvitations,
    });
  } catch (error) {
    console.error("Get user invitations error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch invitations",
    });
  }
}

/**
 * Get count of pending invitations for current user
 * GET /api/v1/users/invitations/count
 */
export async function getUserInvitationsCount(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const count = await db.farmMember.count({
      where: {
        userId,
        status: MemberStatus.PENDING,
      },
    });

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("Get invitations count error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch invitations count",
    });
  }
}