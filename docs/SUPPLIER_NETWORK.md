# Suppliers & partners network (module 08)

Routes `/suppliers`, `/suppliers/[id]` · Store: `useSuppliers`, `updateSupplier`, `createSupplier`.

## Classification and filters
Country, region (North Africa, West Africa, Europe, Middle East), city, sector, domain, service/specialisation (search), relationship status (stage chips with counts). Network footprint charts: suppliers by country and by primary sector (with active count). CSV export.

## Profile fields
Company name, description, services, sector(s), domain, specialisation, geographic coverage, website, phone, email, address, main contacts (name, role, email, phone, languages), relationship owner, status, first contact, last interaction, previous cooperation, notes, documents (placeholders), follow-up date, capacity score, record source.

## Actions
- **Create / edit** via a validated form (required name, country, sector; email and URL format; duplicate-name check; follow-up after last interaction).
- **Record activity** (type, date, summary, optional stage change, next follow-up). Clicking a stage on the stepper opens this form — every stage change leaves a trace.
- **Schedule meeting** (subject, date, time, location, attendees) — logs an interaction and advances early-stage relationships to "Meeting scheduled". Mark meetings held or cancelled.
- **Add contact**, edit notes, set follow-up date.
- **Where this supplier could help**: active tenders in its sectors (joins the network to demand).

Overdue follow-ups are highlighted in the list, the profile, the acquisition module and the notification centre. Nothing is ever sent to a provider.
