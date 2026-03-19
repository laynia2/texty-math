# Texty Math

Texty Math is a simple plain-text bill and budget tracker built for personal use.

It is designed to feel fast and low-friction:
- Type bills in plain text
- Track income
- Assign payment sources
- Mark bills as done or paid
- See overdue, due-this-week, and next-due items
- Compare monthly income vs bills due

---

## Current Features

- Plain text entry
- Manual bills, autopay bills, and income
- Payment source tracking with `from ...`
- Paid state recognized from:
  - paid
  - done
  - [x]
- Unchecked state:
  - [ ]
- Tap-to-toggle checkbox in parsed view
- Mark done / reopen buttons
- Summary cards for:
  - Manual Due
  - Autopay Due
  - Paid
  - Total Due
  - Income
  - Net
- Account breakdown
- Overdue card
- This Week card
- Next Due card
- Local autosave in browser storage

---

## Example Input

# April Budget Test

--- Income ---
income 4/01 Daniel paycheck 3200
income 4/01 Brittany paycheck 2800
income 4/15 Daniel paycheck 3200
income 4/15 Brittany paycheck 2800

--- Housing / Utilities ---
[ ] manual 4/01 Mortgage 1850 from Checking
auto 4/03 Internet 80 from Credit Card
done manual 4/07 Trash 28 from Checking
paid auto 4/08 Cell phones 135 from Credit Card

---

## Status Rules

These all count as paid:
- paid
- done
- [x]

Unchecked:
- [ ]

---

## Line Format

General bill format:

[status] type date title amount from account

Examples:

[ ] manual 4/21 HELOC interest 190 from Checking
auto 4/10 Car insurance 165 from Credit Card
done manual 4/12 Babysitter 160 from Checking
paid 4/02 Kids activity fee 75 from Credit Card
income 4/15 Daniel paycheck 3200

---

## Notes

- The app uses the last number on the line as the amount.
- Dates should be entered as M/D or MM/DD.
- Income lines are not assigned to payment accounts.
- Data is currently saved in browser local storage.
- This project is intentionally lightweight and personal-use only.

---

## Planned Improvements

- Skip status for bills not due this month
- Export/import to file
- Recurring monthly templates
- Account balances and warnings
- Better mobile quick-add tools