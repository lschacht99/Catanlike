import type { CommodityKey, ResourceKey } from "@/types/game";
import { commodityIconAsset, resourceIconAsset } from "@/game/assets";

export function AssetIcon({
  src,
  alt = "",
  className = "h-5 w-5",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return <img src={src} alt={alt} className={`inline-block object-contain ${className}`} draggable={false} />;
}

export function ResourceIcon({ resource, className }: { resource: ResourceKey; className?: string }) {
  return <AssetIcon src={resourceIconAsset(resource)} className={className} />;
}

export function CommodityIcon({ commodity, className }: { commodity: CommodityKey; className?: string }) {
  return <AssetIcon src={commodityIconAsset(commodity)} className={className} />;
}
