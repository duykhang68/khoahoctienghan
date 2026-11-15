export const retryable=e=>e&&(e.status===429||(e.status>=500&&e.status<=599)||['TimeoutError','AbortError','TypeError'].includes(e.name)||retryable(e.cause));
export const code=e=>['APP_IDENTITY_MISMATCH','APP_INSTALLATION_MISMATCH','APP_PERMISSIONS_MISMATCH','APP_BOT_MISMATCH','PAYLOAD_MISSING','PAYLOAD_INVALID','PAYLOAD_DIGEST_MISMATCH','ROUTE_EXISTS','RECEIPT_MISMATCH'].includes(e?.code)?e.code:retryable(e)?'UPSTREAM_TEMPORARY':'PUBLISH_BLOCKED';

export function planScheduleFailure(error,attempts,now){
 const again=retryable(error)&&attempts<3;
 return {state:again?'retry':'blocked',nextAt:now+120000*attempts,errorCode:code(error)};
}
