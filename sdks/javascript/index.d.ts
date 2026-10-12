export type AssetRole = 'personal' | 'product' | 'result';
export interface ProductPreparation {status:'not_scheduled'|'queued'|'preparing'|'ready'|'unavailable'|'failed'|'simulated'|'not_required'; updatedAt?:string; operationId?:string; error?:{code:string;message:string}; evidence?:{provider:string|null;model:string|null;cacheHit:boolean;cacheScope:'shared'|'worker-local'}}
export interface Asset { id: string; role: AssetRole; status: 'pending' | 'ready' | 'deleted'; contentType: string; sizeBytes: number; url?: string; expiresAt?: string; retentionExpiresAt?:string; deletedAt?:string; purgeState?:string; fileName?:string; contentHash?:string; preparation?:ProductPreparation }
export interface ImageUploadOptions {fileName?:string;signal?:AbortSignal;onAssetCreated?:(assetId:string)=>void|Promise<void>}
export interface AccountLink { id: string; externalUserId: string; email: string; veloxUserId: string; status: "linked" | "unlinked" | "relink_required"; linkedAt: string; lastLoginAt?: string; unlinkedAt?: string | null }
export interface Session { link?: AccountLink; accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: number; user: { id: string; email: string } }
export interface UploadTarget { assetId: string; uploadUrl: string; uploadHeaders: Record<string,string>; expiresAt: string }
export interface RequestContext {runId?:string;scenarioId?:string;requestId?:string}
/** Generation routes are assigned by Velox Admin, never selected by a caller. */
export interface GenerationOptions {context?:RequestContext;notificationEndpointId?:string}
export interface GenerationJob { id: string; kind: 'dressme' | 'animateme'; status: 'queued' | 'running' | 'succeeded' | 'failed'; createdAt: string; environment?:string; context?:RequestContext; timings?:Record<string,string>; simulated: boolean; result?: Asset; error?: { code: string; message: string } }
export interface DressMeJob extends GenerationJob { kind: 'dressme' }
export interface AnimateMeJob extends GenerationJob { kind: 'animateme' }
export interface PollOptions<T extends GenerationJob = GenerationJob> { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal; onStatus?: (job: T) => void | Promise<void> }
export class VeloxError extends Error { status: number; code: string; requestId?: string; retryAfter?: string }
export class VeloxDressMe {
  constructor(options: { baseUrl: string; clientId: string; fetch?: typeof fetch; timeoutMs?: number; autoRefresh?: boolean; serverToken?: string; integrationKey?: string; subject?: string });
  applicationInfo(): Promise<{kind:'application'; id:string; scopes:string[]; clientId:string; environment:string}>;
  notificationEndpoints():Promise<{environment:string;revision:number;endpoints:Array<{id:string;url:string;keyId:string;enabled:boolean;revision:number;managedBy:'partner'|'velox'}>;deliveries:Array<{eventId:string;jobId:string;endpointId:string;status:string;attempts:number;lastAttempt:{at:string;outcome:string;httpStatus?:number;error?:string}|null;deliveredAt:string|null}>}>;
  registerNotificationEndpoint(url:string):Promise<{id:string;url:string;keyId:string;secret:string}>;
  setNotificationEndpointState(id:string,input:{enabled:boolean;expectedRevision:number}):Promise<{updated:true}>;
  importProductImage(url:string, options?:{signal?:AbortSignal}):Promise<Asset>;
  deleteAsset(id:string):Promise<{id:string;status:'deleted';purgeState:string}>;
  deleteSubject():Promise<{status:'deleted';assets:number;physicalPurge:'pending'}>;
  profiles():Promise<{environment:string;configurationRevision:number;routingRevision:number;dressme:Array<{id:string;label:string;default:boolean;selectable:boolean}>;animateme:Array<{id:string;label:string;default:boolean;selectable:boolean}>;note:string}>;
  overview(options?:{runId?:string}):Promise<Record<string,unknown>>;
  session: Session | null;
  createLinkChallenge(externalUserId: string, purpose?: 'link' | 'login'): Promise<{challengeId: string; nonce: string; expiresIn: number}>;
  linkAccount(input: {challengeId: string; idToken: string; consent: true}): Promise<Session>;
  loginLinkedAccount(input: {challengeId: string; idToken: string}): Promise<Session>;
  linkedAccount(): Promise<AccountLink>;
  unlinkAccount(linkId: string): Promise<{unlinked: true}>;
  requestCode(email: string): Promise<{ challengeId: string; expiresIn: number }>;
  verifyCode(challengeId: string, code: string): Promise<Session>;
  refresh(): Promise<Session>;
  logout(): Promise<void>;
  me(): Promise<{ id: string; email: string; clientId: string; environment: string }>;
  createImageUpload(input: { role: 'personal' | 'product'; fileName: string; contentType: string; sizeBytes: number }, options?: { signal?: AbortSignal }): Promise<UploadTarget>;
  completeImageUpload(assetId: string, options?: { signal?: AbortSignal }): Promise<Asset>;
  uploadImage(file: Blob, options: ImageUploadOptions & {role:'personal'|'product'}): Promise<Asset>;
  uploadPersonalPhoto(file: Blob, options?: ImageUploadOptions): Promise<Asset>;
  uploadProductImage(file: Blob, options?: ImageUploadOptions): Promise<Asset>;
  getAsset(id: string): Promise<Asset>;
  createDressMeJob(input: { personalAssetId: string; productAssetId: string } & GenerationOptions, options?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<DressMeJob>;
  getDressMeJob(id: string, options?: { signal?: AbortSignal }): Promise<DressMeJob>;
  waitForDressMe(id: string, options?: PollOptions<DressMeJob>): Promise<DressMeJob>;
  createAnimateMeJob(input: { sourceAssetId: string } & GenerationOptions, options?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<AnimateMeJob>;
  getAnimateMeJob(id: string, options?: { signal?: AbortSignal }): Promise<AnimateMeJob>;
  waitForAnimateMe(id: string, options?: PollOptions<AnimateMeJob>): Promise<AnimateMeJob>;
  waitForJob(kind: 'dressme' | 'animateme', id: string, options?: PollOptions): Promise<GenerationJob>;
}
