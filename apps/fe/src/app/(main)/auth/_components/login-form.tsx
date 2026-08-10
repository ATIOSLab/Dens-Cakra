"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, Lock, LogIn, User } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { authClient } from "@/lib/auth/auth-client";
import { detectPublicIp } from "@/lib/network/public-ip";

const formSchema = z.object({
  identifier: z.string().min(1, { message: "Masukkan alamat email atau username Anda." }),
  password: z.string().min(8, { message: "Kata sandi minimal harus 8 karakter." }),
  remember: z.boolean().optional(),
});

type LocationGateState = "idle" | "requesting" | "blocked" | "unsupported";

function requestCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20_000,
    });
  });
}

async function syncCurrentSessionNetwork() {
  const ipAddress = await detectPublicIp({ timeout: 5000 });
  await apiBrowserMutation("POST", "/me/session-network", { ipAddress });
}

type LoginFormProps = {
  officerOnly?: boolean;
};

export function LoginForm({ officerOnly = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [locationGate, setLocationGate] = useState<LocationGateState>("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [loginPosition, setLoginPosition] = useState<GeolocationPosition | null>(null);
  const hasRequestedLocation = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
      remember: false,
    },
  });

  const requestLoginLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Browser ini tidak mendukung GPS. Anda tetap dapat login tanpa lokasi.");
      setLocationGate("unsupported");
      return null;
    }

    setLocationMessage("Menunggu izin lokasi dari browser Anda...");
    setLocationGate("requesting");

    try {
      const position = await requestCurrentPosition();
      setLoginPosition(position);
      setLocationGate("idle");
      return position;
    } catch (error) {
      const geolocationError = error as GeolocationPositionError;
      const denied = geolocationError.code === geolocationError.PERMISSION_DENIED;
      setLocationMessage(
        denied
          ? "Izin lokasi ditolak. Anda tetap dapat login tanpa lokasi."
          : "Lokasi belum dapat diperoleh. Anda tetap dapat login tanpa lokasi.",
      );
      setLocationGate("blocked");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!officerOnly || hasRequestedLocation.current) {
      return;
    }

    hasRequestedLocation.current = true;
    void requestLoginLocation();
  }, [officerOnly, requestLoginLocation]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setFormError(null);

    startTransition(async () => {
      const callbackUrl = searchParams.get("callbackUrl")?.trim();
      const identifier = values.identifier.trim();
      const isEmail = identifier.includes("@");

      const signInResult = isEmail
        ? await authClient.signIn.email({
            email: identifier,
            password: values.password,
            rememberMe: values.remember ?? true,
          })
        : await authClient.signIn.username({
            username: identifier,
            password: values.password,
            rememberMe: values.remember ?? true,
          });

      const { data, error } = signInResult;

      if (error) {
        if (error.status === 403) {
          setFormError("Email Anda belum terverifikasi. Silakan periksa kotak masuk dan lakukan verifikasi.");
          return;
        }

        setFormError(error.message || "Gagal masuk. Silakan periksa kembali kredensial Anda.");
        return;
      }

      const isFieldOfficer = data?.user.role === "field_officer";
      if (officerOnly && !isFieldOfficer) {
        await authClient.signOut();
        setFormError("Akun ini tidak dapat digunakan di halaman ini. Gunakan halaman login Supervisi/Pimpinan.");
        return;
      }

      if (!officerOnly && isFieldOfficer) {
        await authClient.signOut();
        const officerLoginUrl = callbackUrl
          ? `/auth/officer?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : "/auth/officer";
        router.replace(officerLoginUrl);
        return;
      }

      await syncCurrentSessionNetwork().catch(() => undefined);

      if (isFieldOfficer && loginPosition) {
        await fetch("/api/field-officer/live-location", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            latitude: loginPosition.coords.latitude,
            longitude: loginPosition.coords.longitude,
            gpsAccuracyMeters: loginPosition.coords.accuracy,
            capturedAt: new Date(loginPosition.timestamp).toISOString(),
          }),
        }).catch(() => undefined);
      }

      router.replace(callbackUrl || "/dashboard");
      router.refresh();
    });
  };

  const isFormDisabled = isPending;

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      {officerOnly && locationGate === "requesting" ? (
        <Alert className="rounded-xl border-border bg-muted/40 text-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
          <AlertDescription className="text-xs">{locationMessage}</AlertDescription>
        </Alert>
      ) : null}
      {officerOnly && loginPosition ? (
        <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          <AlertDescription className="text-xs">Lokasi perangkat siap disertakan saat Anda masuk.</AlertDescription>
        </Alert>
      ) : null}
      {(locationGate === "blocked" || locationGate === "unsupported") && (
        <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600">
          <AlertDescription className="text-xs">{locationMessage}</AlertDescription>
        </Alert>
      )}
      {formError ? (
        <Alert
          variant="destructive"
          className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
        >
          <AlertDescription className="text-xs">{formError}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-4">
        {/* Email or Username */}
        <Controller
          control={form.control}
          name="identifier"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="login-identifier"
                className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Email atau Nama Pengguna
              </FieldLabel>
              <div className="relative">
                <User className="absolute left-3 top-4 size-4 text-muted-foreground/55" />
                <Input
                  {...field}
                  id="login-identifier"
                  type="text"
                  placeholder="nama@email.com atau username"
                  autoComplete="username"
                  aria-invalid={fieldState.invalid}
                  disabled={isFormDisabled}
                  className="h-12 rounded-[9px] border-border bg-background pl-9 text-sm placeholder:text-muted-foreground/40 focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/15 dark:bg-zinc-950/35"
                />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password */}
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="login-password"
                className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Kata Sandi
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-4 size-4 text-muted-foreground/55" />
                <Input
                  {...field}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isFormDisabled}
                  className="h-12 rounded-[9px] border-border bg-background pl-9 pr-10 text-sm placeholder:text-muted-foreground/40 focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/15 dark:bg-zinc-950/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-2.5 top-2.5 grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Baris ingat saya dan lupa kata sandi */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <Controller
            control={form.control}
            name="remember"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid} className="items-center gap-2">
                <Checkbox
                  id="login-remember"
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  aria-invalid={fieldState.invalid}
                  disabled={isFormDisabled}
                  className="border-border rounded-[4px]"
                />
                <FieldContent>
                  <FieldLabel
                    htmlFor="login-remember"
                    className="font-sans text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Ingat perangkat ini
                  </FieldLabel>
                </FieldContent>
              </Field>
            )}
          />

          <Link
            prefetch={false}
            href="/auth/forgot-password"
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
      </FieldGroup>

      {/* Primary Submit Button */}
      <Button
        className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-zinc-900 font-sans font-semibold text-white shadow-sm transition-all duration-200 hover:bg-zinc-800 active:scale-[0.99] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        type="submit"
        disabled={isFormDisabled}
      >
        {isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            <span>Menghubungkan...</span>
          </>
        ) : (
          <>
            <LogIn className="size-4" />
            <span>Masuk</span>
          </>
        )}
      </Button>
    </form>
  );
}
