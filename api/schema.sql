-- Esquema de la tienda online. Vive aparte ("tienda") para no mezclarse con las tablas del CRM en "public".
create schema if not exists tienda;

-- Productos, banners y fondos de portada. Cada documento guarda sus campos en "data" (igual que la base de claude.ai).
create table if not exists tienda.documentos (
  coleccion   text not null check (coleccion in ('productos','banners','portada')),
  id          text not null,
  data        jsonb not null default '{}',
  creado_en   timestamptz not null default now(),
  cambiado_en timestamptz not null default now(),
  primary key (coleccion, id)
);
create index if not exists documentos_codigo on tienda.documentos ((data->>'codigo')) where coleccion = 'productos';
create index if not exists documentos_cambiado on tienda.documentos (coleccion, cambiado_en);

-- Administradores del backoffice
create table if not exists tienda.admins (
  id          bigserial primary key,
  email       text not null unique,
  nombre      text not null default '',
  clave_hash  text not null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  ultimo_ingreso timestamptz
);

create table if not exists tienda.sesiones (
  token_hash  text primary key,
  admin_id    bigint not null references tienda.admins(id) on delete cascade,
  vence       timestamptz not null,
  creado_en   timestamptz not null default now()
);
create index if not exists sesiones_vence on tienda.sesiones (vence);

-- Intentos de ingreso (para frenar a quien prueba claves)
create table if not exists tienda.intentos_ingreso (
  id        bigserial primary key,
  email     text not null,
  ip        text not null default '',
  ok        boolean not null,
  creado_en timestamptz not null default now()
);
create index if not exists intentos_email on tienda.intentos_ingreso (email, creado_en);
create index if not exists intentos_ip on tienda.intentos_ingreso (ip, creado_en);

-- Historial de sincronizaciones con Plex (y de importaciones de planillas)
create table if not exists tienda.sincronizaciones (
  id           bigserial primary key,
  origen       text not null,            -- 'plex' (script automático) o 'planilla' (backoffice)
  filas        int not null default 0,
  actualizados int not null default 0,
  creados      int not null default 0,
  sin_cambios  int not null default 0,
  ignorados    int not null default 0,
  errores      jsonb not null default '[]',
  creado_en    timestamptz not null default now()
);
