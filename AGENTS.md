# Project Agent Guidelines

This file defines the default execution rules for work in this repository.

## Context

Dex-ui is a desktop application for dex tasks visualization. It will allow users to open projects, look for dex tasks in it and display it in a kanban board. Users will then be able to add/edit/delete/archive tasks

## Core Stack Rules

- Routing is done with **TanStack Router**.
- Task management is done with **dex**, and dex should **always** be used to track and manage work.
- UI components come from **Zaidan's shadcn registry** which you can find [here](https://zaidan.carere.dev).
- The package manager is **Bun**.

## Project Management

Split any task you feel is too big into separate dex sub tasks. Make sure to keep track of which one you're working on and update their status as you go along.

## Working Expectations

- Prefer established project patterns and avoid introducing parallel alternatives for routing, task tracking, components, or package management.
- If a new task is started, create/manage it in dex first, then implement.
- When adding UI, use components sourced from Zaidan's shadcn registry before building custom primitives.
- Use Bun commands for dependency management and script execution.
