📦 Directus Migration Guide Through API
This guide enables you to migrate your Directus project schema, roles, policies, permissions, flows, and operations from an old instance to a new one using only API calls (Postman or any REST client). All request bodies reference JSON files in this repository—edit them as needed before running each step.

If any Doubt refer the official Directus docs: https://directus.io/docs/api
📁 Repository Structure
File Name	Description
schema_snapshot.json	Full schema snapshot: collections, fields, and relations
directus_roles.json	Roles extracted from the old instance
directus_policies.json	Policies extracted from the old instance
directus_flows.json	Flows extracted from the old instance
directus_operations.json	Operations extracted from the old instance
directus_permissions.json	Permissions extracted from the old instance
✅ What Snapshot Covers
The schema_snapshot.json file includes:

Collections: all custom and system collections schema
Fields: definitions and configuration of each field
Relations: relationships between collections
⛔ It does NOT include users, roles, policies, permissions, flows, operations, or actual data.

🛠️ Step-by-Step Migration Process
Follow these steps in order, customizing bodies from the JSON files where needed:

Step 1: Import Schema Snapshot
Request:

POST /schema/apply
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
Body: paste full schema_snapshot.json.

✅ Sets up collections, fields, and relations.

Step 2: Migrate Roles
For each entry in directus_roles.json:

POST /roles
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
Body:

{
  "data": [
    {
      "id": "2f24211d-d928-469a-aea3-3c8f53d4e426",
      "name": "Administrator",
      "icon": "verified_user",
      "description": "Admins have access to all managed data within the system by default",
      "children": [],
      "policies": [],
      "users": []
    }
  ],
  "meta": {}
}
✅ Record the new role IDs for mapping later.

Step 3: Migrate Policies
For each in directus_policies.json:

POST /policies
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
Body:

{
  "data": [
    {
      "id": "22640672-eef0-4ee9-ab04-591f3afb288",
      "name": "Admin",
      "icon": "supervised_user_circle",
      "description": null,
      "ip_access": null,
      "enforce_tfa": false,
      "admin_access": true,
      "app_access": true,
      "users": [
        "0bc7b36a-9ba9-4ce0-83f0-0a526f354e07"
      ],
      "roles": [
        "8b4474c0-288d-4bb8-b62e-8330646bb6aa"
      ],
      "permissions": [
        "5c74c86f-cab0-4b14-a3c4-cd4f2363e826"
      ]
    }
  ],
  "meta": {}
}
✅ Map roles and permissions arrays to new IDs.

Step 4: Migrate Flows
For each in directus_flows.json:

POST /flows
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
Body:

{
  "name": "Map user to stakeholder apps",
  "status": "active",
  "trigger": "event",
  "accountability": "all",
  "options": {
    "type": "action",
    "scope": ["items.create"],
    "collections": ["directus_users"]
  }
}
✅ Record each new flow ID.

Step 5: Migrate Operations
For each in directus_operations.json:

POST /operations
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
Body:

{
  "name": "Update matching stakeholders",
  "key": "update_matching_stakeholders",
  "type": "item-update",
  "position_x": 19,
  "position_y": 1,
  "options": { ... },
  "flow": "new-flow-id"
}
✅ Map flow to the corresponding new flow ID. Record new operation IDs.

Step 6: Attach Operations to Flows
For each flow requiring an operation:

PATCH /flows/{new-flow-id}
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
Body:

{"operation": "new-operation-id"}
✅ This links flow to its operations.

Step 7: Migrate Permissions
For each in directus_permissions.json:

POST /permissions
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
Body:

{
  "data": [
    {
      "id": 1,
      "collection": "customers",
      "action": "create",
      "permissions": {},
      "validation": {},
      "presets": {},
      "fields": []
    }
  ],
  "meta": {}
}
✅ Map the role field to new ID. Ensure collection and action match schema.

✔️ Final Notes
Only include fields shown in examples—others will cause errors.
Request bodies must be copied exactly from JSON file templates.
Always track new IDs manually for proper mappings.
All endpoints and behaviors are verified per Directus docs.
This process was tested end-to-end to ensure no errors.
Once complete, your new Directus instance will have identical schema, roles, policies, flows, operations, and permissions as your old instance—without migrating users or items.
