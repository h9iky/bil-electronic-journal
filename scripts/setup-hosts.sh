#!/bin/bash
set -e

# Проверяем наличие bilgrade в /etc/hosts
if ! grep -w "bilgrade" /etc/hosts >/dev/null 2>&1; then
    echo "" >> /etc/hosts
    echo "# BIL Electronic Journal" >> /etc/hosts
    echo "127.0.0.1 bilgrade" >> /etc/hosts
    echo "::1       bilgrade" >> /etc/hosts
    echo "✅ bilgrade added to /etc/hosts"
else
    echo "ℹ️ bilgrade is already in /etc/hosts"
fi
