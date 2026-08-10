import { type Options, publicIpv4, publicIpv6 } from "public-ip";

export async function detectPublicIp(options?: Options) {
  try {
    return await publicIpv4(options);
  } catch {
    return publicIpv6(options);
  }
}
