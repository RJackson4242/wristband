# Wristband

## Todo

- [x] Initialisation
- [x] Deployment
- [x] Database Connection
- [x] Authentication
- [x] Database Schema
- [ ] MVP Convex Actions
- [ ] MVP UI
- [ ] Session Musicians
- [ ] Setlists
- [ ] Stored tracklists

## Actions

### Utils

- [x] Get current user (optional error)
- [x] Get user from clerk token
- [x] Assert band membership / role

### Users

- [x] Get User Details
- [x] Upsert on login
- [x] Upsert from Clerk
- [x] Delete from Clerk

### Bands

- [x] Create Band
- [x] Get Band Details
- [x] Update Band Name
- [x] Delete Band

### Invites + Memberships

- [x] Invite User
- [x] Get Memberships from User
- [x] Get Memberships from Band
- [x] Accept Invite
- [x] Promote User to Admin
- [x] Leave Band
- [x] Kick User

### Events

- [ ] Create Event (->Create RSVPs)
- [ ] Retrieve Events from Band
- [ ] Retrieve Event Details
- [ ] Update Event Details
- [x] Delete Event

### RSVPs

- [ ] Create RSVPs from Event + Band (When new event is created)
- [ ] Create RSVPs from User + Band (When new member joins)
- [ ] Retrieve Events from User
- [ ] Retrieve Users from Event
- [ ] Update RSVP Status

## UI

- [ ] Login / Sign-up Page
- [ ] My Bands
- [ ] My Events
- [ ] My Invites
- [ ] Band Page
- [ ] Invite Form
- [ ] Event Form
