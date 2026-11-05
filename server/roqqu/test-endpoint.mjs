// Roqqu team's official confirmation, relayed by the project owner on
// 2026-11-05: this origin supports Test mode using x-staging-api-key and the
// organizers' Test Private Key. Never derive this allowlist from browser input.
export const verifiedTestEndpoint = Object.freeze({
  baseUrl:'https://service.roqqu.com/v1',
  source:'Roqqu team confirmation supplied by project owner, 2026-11-05; https://roqqu-api-services.gitbook.io/ras/authentication',
  authenticationHeader:'x-staging-api-key',
  credentialRole:'Test Private Key',
  // Endpoint approval does not approve a wallet, network or financial action.
  receivingRoutes:Object.freeze([]),
});
