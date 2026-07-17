import { publicIpv4, publicIpv6, type Options } from "public-ip";

export async function detectPublicIp(options?: Options) {
  try {
    return await publicIpv4(options);
  } catch {
    return publicIpv6(options);
  }
}
