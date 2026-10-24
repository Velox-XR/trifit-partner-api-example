import assert from 'node:assert/strict';

export const endpoint = 'https://studio.v3lox.com/partner/trifit/mcp';
export const allowed = Object.freeze(['search', 'fetch', 'get_integration_example', 'get_partner_access_requirements']);
export const publicTools = Object.freeze([...allowed, 'get_partner_application_guide']);
export const connectedTools = Object.freeze([
  'get_trifit_account', 'get_trifit_profile', 'get_trifit_allowance', 'list_trifit_library',
  'prepare_trifit_upload', 'upload_trifit_image', 'create_trifit_try_on',
  'get_trifit_try_on', 'show_trifit_try_on', 'get_guest_demo_status',
  'prepare_guest_upload', 'create_try_on', 'get_try_on',
]);

// Validate the full inventory; never equate a four-tool client allowlist with a
// read-only server. Connected tools are inspected as metadata, never invoked.
export function checkInventory(inventory) {
  assert.deepEqual(inventory.tools.map(t => t.name).sort(), [...publicTools, ...connectedTools].sort());
  for (const tool of inventory.tools) {
    const security = tool._meta?.securitySchemes;
    if (publicTools.includes(tool.name)) {
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.destructiveHint, false);
      assert.deepEqual(security, [{type:'noauth'}]);
    } else {
      assert.ok(Array.isArray(security) && security.length > 0);
      assert.ok(security.every(scheme => scheme.type === 'oauth2' && Array.isArray(scheme.scopes)));
    }
  }
}
