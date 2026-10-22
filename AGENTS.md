# Architecture rules

- Store manual e-book access in `ebook_enrollments`, never in course enrollments or paid orders, so access grants do not create fictitious sales or Meta Purchase events.
- Resolve protected e-book downloads server-side using active manual access or paid main/extra purchases; never expose storage paths in library queries.