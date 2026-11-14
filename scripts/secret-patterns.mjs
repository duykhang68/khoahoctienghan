// Detection only: never parse installation tokens or impose an upper length limit.
const signatures=[
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 /gh[pousr]_[A-Za-z0-9]{30,}/,
 /github_pat_[A-Za-z0-9_]{40,}/,
 /ghs_[A-Za-z0-9._-]{36,}/,
];

export function containsPotentialSecret(text){
 return signatures.some(pattern=>pattern.test(text));
}
