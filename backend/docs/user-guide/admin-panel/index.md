# Admin Panel

The web-based admin panel previously included in this boilerplate (powered by CRUDAdmin) has been removed from the project. The codebase no longer ships or maintains a CRUDAdmin-powered admin interface.

If you relied on the admin panel, you can continue to use FastCRUD as the data access layer for efficient CRUD operations and pagination. For custom admin or management UIs, consider one of the following options:

- Build a lightweight internal admin frontend that talks to your existing API endpoints backed by FastCRUD.
- Integrate a third-party admin UI (e.g., Tailwind + Remix/Next, React Admin, or a custom dashboard) that consumes the same API.
- Reintroduce a separate admin service that uses FastCRUD for data access but lives outside this repository.

For details on FastCRUD usage (queries, pagination, joins, and creating endpoints), see: https://benavlabs.github.io/FastAPI-boilerplate/user-guide/database/crud/
