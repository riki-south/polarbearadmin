import woodBadge from "../../assets/badges/bear-wood.svg";
import stoneBadge from "../../assets/badges/bear-stone.svg";
import ironBadge from "../../assets/badges/bear-iron.svg";
import silverBadge from "../../assets/badges/bear-silver.svg";
import goldBadge from "../../assets/badges/bear-gold.svg";
import diamondBadge from "../../assets/badges/bear-diamond.svg";
import { getAchievementBadgeTier, type AchievementBadgeTier } from "./achievementUtils";

const BADGE_IMAGES: Record<AchievementBadgeTier, string> = {
  wood: woodBadge,
  stone: stoneBadge,
  iron: ironBadge,
  silver: silverBadge,
  gold: goldBadge,
  diamond: diamondBadge,
};

export function AchievementName({
  name,
  stacks,
  className = "",
}: {
  name: string;
  stacks: number;
  className?: string;
}) {
  const badge = getAchievementBadgeTier(stacks);

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      {badge ? (
        <img
          src={BADGE_IMAGES[badge.tier]}
          alt={`${badge.label} 등급 업적 뱃지`}
          title={`${badge.label} 등급 · 업적 ${stacks}스택`}
          className="h-6 w-6 shrink-0 object-contain"
        />
      ) : null}
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}
