import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangleIcon } from "lucide-react"
import { ProviderType } from "@/lib/providers/types";
import { ProfilePicturePicker } from "../profile/ProfilePicturePicker";

interface AuthViewProps {
  provider: string;
  providerLock?: boolean;
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  guestName: string;
  setGuestName: (val: string) => void;
  guestSessionCode: string;
  setGuestSessionCode: (val: string) => void;
  loading: boolean;
  handleLogin: (e: React.FormEvent) => void;
  handleGuestLogin: (e: React.FormEvent) => void;
  sessionCodeParam: string | null;
  isExperimental: boolean;
  onProfilePictureChange?: (base64: string | null) => void;
  activeTab: string;
  setActiveTab: (activeTab: string) => void;
}

export function AuthView({
  provider,
  username,
  setUsername,
  password,
  setPassword,
  guestName,
  setGuestName,
  guestSessionCode,
  setGuestSessionCode,
  loading,
  handleLogin,
  handleGuestLogin,
  sessionCodeParam,
  isExperimental,
  onProfilePictureChange,
  activeTab,
  setActiveTab,
}: AuthViewProps) {

  const providerName = provider[0].toUpperCase() + provider.substring(1);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="login">Log in</TabsTrigger>
        <TabsTrigger value="join">Guest</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="space-y-4">
        <form onSubmit={handleLogin} className="space-y-3">
          <CardDescription>
            Enter your {providerName} credentials
          </CardDescription>

          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-muted border-input"
          />
          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {provider === ProviderType.NATIVE && (
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <Button type="submit" className="w-full mt-2 font-semibold" disabled={loading}>
            {loading ? "Connecting..." : "Log in"}
          </Button>

          {isExperimental && (
            <Alert className="max-w-full mt-2 ">
              <AlertTriangleIcon className="text-amber-600!"/>
              <AlertTitle className="whitespace-nowrap">Experimental provider integration</AlertTitle>
              <AlertDescription className="text-xs">
                Certain features may not work as expected.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </TabsContent>
      <TabsContent value="join" className="space-y-5">
        <form onSubmit={handleGuestLogin} className="space-y-3">
          <div className="flex justify-center pb-2">
            <ProfilePicturePicker 
                userName={guestName || "G"} 
                onImageSelected={onProfilePictureChange}
            />
          </div>
          <CardDescription>Enter a display name {!sessionCodeParam ? 'and code' : ''} to continue</CardDescription>
          <Input

            placeholder="Display name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="bg-muted border-input"
            autoFocus
          />
          {!sessionCodeParam && (
            <>
              <Label htmlFor="session-code" className="mt-1 mb-2 text-muted-foreground">
                {" "}
                Session code
              </Label>
              <Input
                id="session-code"
                value={guestSessionCode}
                placeholder="1234"
                onChange={(e) => setGuestSessionCode(e.target.value.toUpperCase())}
                className="bg-muted border-input font-mono tracking-widest uppercase"
                maxLength={4}
              />
            </>
          )}
          <div className="pt-1.5">
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={loading || !guestName || !guestSessionCode}
            >
              {loading ? "Joining..." : "Join"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground pt-1">
            Joining as a guest lets you join a session without an account.
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
