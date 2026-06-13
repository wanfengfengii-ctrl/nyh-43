#!/bin/bash

# Git 提交脚本
# 用法1: ./git-push.sh <仓库名> <提交消息>       (推荐，如: lf-15 或 nyh-17)
# 用法2: ./git-push.sh <GitHub仓库URL> <提交消息> (完整URL)
# 示例: ./git-push.sh lf-15 "session id"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

GITHUB_OWNER="${GITHUB_OWNER:-wanfengfengii-ctrl}"
KEYCHAIN_SERVICE="${KEYCHAIN_SERVICE:-github-token-wanfengfengii-ctrl}"

# 检查参数数量
if [ $# -ne 2 ]; then
    echo -e "${RED}错误: 参数不足${NC}"
    echo ""
    echo "用法: $0 <仓库名|GitHub仓库URL> <提交消息>"
    echo ""
    echo "示例:"
    echo "  $0 lf-15 \"session id\""
    echo "  $0 nyh-17 \"修复了登录bug\""
    echo "  $0 https://github.com/${GITHUB_OWNER}/lf-15.git \"session id\""
    echo ""
    exit 1
fi

REPO_INPUT=$1
COMMIT_MSG=$2

if [ -z "${GITHUB_TOKEN:-}" ] && command -v security >/dev/null 2>&1; then
    GITHUB_TOKEN=$(security find-generic-password -a "$USER" -s "$KEYCHAIN_SERVICE" -w 2>/dev/null || true)
fi

# 判断输入是仓库名还是完整 URL
if [[ "$REPO_INPUT" =~ ^(lf|nyh)-[0-9]+$ ]]; then
    # 仓库名，自动组装 URL
    REPO_URL="https://github.com/${GITHUB_OWNER}/${REPO_INPUT}.git"
    echo "仓库名: $REPO_INPUT → $REPO_URL"
elif [[ "$REPO_INPUT" =~ ^https://github\.com/[^/]+/[^/]+\.git$ ]]; then
    # 完整 URL，直接使用
    REPO_URL=$REPO_INPUT
elif [[ "$REPO_INPUT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}错误: 现在需要输入完整仓库名，例如 lf-${REPO_INPUT} 或 nyh-${REPO_INPUT}${NC}"
    exit 1
else
    # 其他输入交给后续确认，兼容特殊 Git URL
    REPO_URL=$REPO_INPUT
fi

# 检查提交消息是否为空
if [ -z "$COMMIT_MSG" ]; then
    echo -e "${RED}错误: 提交消息不能为空${NC}"
    exit 1
fi

# 验证 GitHub URL 格式
if [[ ! "$REPO_URL" =~ ^https://github\.com/[^/]+/(lf|nyh)-[0-9]+\.git$ ]]; then
    echo -e "${YELLOW}警告: URL 格式可能不正确${NC}"
    echo "期望格式: https://github.com/${GITHUB_OWNER}/lf-15.git 或 https://github.com/${GITHUB_OWNER}/nyh-17.git"
    echo "您输入的是: $REPO_URL"
    echo ""
    read -p "是否继续? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 1
    fi
fi

echo "=========================================="
echo "Git 提交脚本"
echo "=========================================="
echo ""
echo "仓库地址: $REPO_URL"
echo "提交消息: $COMMIT_MSG"
echo "当前目录: $(pwd)"
echo ""

run_git() {
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        local askpass
        local status

        askpass=$(mktemp "${TMPDIR:-/tmp}/git-askpass.XXXXXX") || return 1
        cat > "$askpass" <<'EOF'
#!/bin/sh
case "$1" in
    *Username*) echo "x-access-token" ;;
    *Password*) printf '%s\n' "$GITHUB_TOKEN" ;;
    *) echo "" ;;
esac
EOF
        chmod 700 "$askpass"
        GITHUB_TOKEN="$GITHUB_TOKEN" GIT_ASKPASS="$askpass" GIT_TERMINAL_PROMPT=0 git "$@"
        status=$?
        rm -f "$askpass"
        return "$status"
    fi

    git "$@"
}

get_changed_files() {
    {
        git diff --name-only
        git diff --name-only --cached
        git ls-files --others --exclude-standard
    } | sed '/^$/d' | sort -u
}

change_module() {
    local path=$1
    case "$path" in
        .svelte-kit/*) echo ".svelte-kit" ;;
        src/components/*|src/lib/components/*) echo "frontend-components" ;;
        src/views/*|src/routes/*) echo "frontend-pages" ;;
        src/store/*|src/stores/*|src/lib/stores.*) echo "frontend-state" ;;
        src/types/*|src/lib/types.*|schemas/*) echo "types-schemas" ;;
        src/utils/*|src/lib/utils.*) echo "utils" ;;
        templates/*) echo "templates" ;;
        static/*|public/*) echo "static-assets" ;;
        models/*) echo "backend-models" ;;
        routers/*) echo "backend-routes" ;;
        *.db|*.sqlite|*.sqlite3|migrations/*|prisma/*) echo "database" ;;
        *.py|requirements.txt) echo "backend-root" ;;
        package.json|package-lock.json|vite.config.*|tsconfig*.json|eslint.config.*|svelte.config.*) echo "project-config" ;;
        *) [[ "$path" == */* ]] && echo "${path%%/*}" || echo "root-files" ;;
    esac
}

change_systems() {
    local path=$1
    case "$path" in
        *.db|*.sqlite|*.sqlite3|migrations/*|prisma/*|schema.sql|schema.prisma) echo "database" ;;
    esac
    case "$path" in
        *.py|requirements.txt|models/*|routers/*|schemas/*|auth.py|main.py|database.py) echo "backend" ;;
    esac
    case "$path" in
        src/*|templates/*|static/*|public/*|*.html|*.css|*.scss|*.vue|*.tsx|*.ts|*.svelte|*.js|index.html|package.json|vite.config.*|tailwind.config.*|tsconfig*.json|eslint.config.*|svelte.config.*|.svelte-kit/*) echo "frontend" ;;
    esac
}

print_change_scope_report() {
    local files count modules systems system_count scope definition reason
    files=$(get_changed_files)
    count=$(printf '%s\n' "$files" | sed '/^$/d' | wc -l | tr -d ' ')

    if [ "$count" -eq 0 ]; then
        scope="无需修改"
        definition="代码理解等无需代码生成的任务"
        reason="没有检测到需要提交的文件改动"
    else
        modules=$(printf '%s\n' "$files" | while IFS= read -r file; do [ -n "$file" ] && change_module "$file"; done | sort -u | wc -l | tr -d ' ')
        systems=$(printf '%s\n' "$files" | while IFS= read -r file; do [ -n "$file" ] && change_systems "$file"; done | sort -u)
        system_count=$(printf '%s\n' "$systems" | sed '/^$/d' | wc -l | tr -d ' ')

        if [ "$count" -eq 1 ]; then
            scope="单文件"
            definition="局部逻辑修改"
            reason="仅 1 个文件发生改动"
        elif [ "$system_count" -ge 2 ]; then
            scope="跨系统多模块"
            definition="涉及前后端联调、跨服务调用、或数据库-后端的垂直改动"
            reason="涉及 $count 个文件、$modules 个逻辑模块、$system_count 个系统面"
        elif [ "$modules" -le 1 ]; then
            scope="模块内多文件"
            definition="涉及同一模块内的接口定义与实现协同"
            reason="涉及 $count 个文件，但集中在同一逻辑模块"
        else
            scope="跨模块多文件"
            definition="涉及多个逻辑单元或调用链修改"
            reason="涉及 $count 个文件、$modules 个逻辑模块"
        fi
    fi

    echo "------------------------------------------"
    echo "修改范围: $scope"
    echo "规则定义: $definition"
    echo "判断依据: $reason"
    if [ "$count" -gt 0 ]; then
        echo "变更文件:"
        printf '%s\n' "$files" | sed -n '1,20p' | sed 's/^/  - /'
        [ "$count" -gt 20 ] && echo "  ... 还有 $((count - 20)) 个文件"
    fi
    echo "------------------------------------------"
    echo ""
}

# 检查是否为 Git 仓库
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}当前目录不是 Git 仓库，正在初始化...${NC}"
    git init
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: Git 初始化失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git 初始化成功${NC}"
    echo ""
fi

# 检查当前 Git 仓库的 remote 配置
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)

if [ -z "$CURRENT_REMOTE" ]; then
    # 没有配置 remote，添加新的
    echo "正在添加 remote origin..."
    git remote add origin "$REPO_URL"
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 添加 remote 失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Remote 添加成功${NC}"
elif [ "$CURRENT_REMOTE" != "$REPO_URL" ]; then
    # remote 已存在但 URL 不匹配
    echo -e "${RED}错误: 当前目录已关联其他仓库${NC}"
    echo "当前 remote: $CURRENT_REMOTE"
    echo "您要提交的: $REPO_URL"
    echo ""
    echo "选项:"
    echo "  1. 切换到正确目录后再运行"
    echo "  2. 如需更换仓库，请删除当前目录的 .git 文件夹后重试"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ Remote URL 匹配${NC}"
fi

# 设置分支为 main
echo ""
echo "设置 main 分支..."
git branch -M main

HAS_COMMIT=true
git rev-parse --verify HEAD >/dev/null 2>&1 || HAS_COMMIT=false

# 检查是否有文件需要提交（包括 tracked、modified 和 untracked）
if [ -z "$(git status --porcelain)" ]; then
    if [ "$HAS_COMMIT" = true ]; then
        echo -e "${YELLOW}没有新的文件变更，将直接尝试推送已有提交${NC}"
        print_change_scope_report
    else
        echo -e "${YELLOW}警告: 没有需要提交的文件变更${NC}"
        echo "请确保当前目录有文件被修改或新增"
        exit 1
    fi
else
    echo ""
    echo "------------------------------------------"
    echo "正在提交..."
    echo "------------------------------------------"

    # 创建 .gitignore 文件（已有则保留，不覆盖）
    if [ -f ".gitignore" ]; then
        echo "→ 已存在 .gitignore，保留现有文件"
    else
        echo "→ 创建 .gitignore 文件..."
        cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
*.egg-info/
.pytest_cache/
.mypy_cache/
.coverage

# Django
*.log
*.sqlite3
db.sqlite3
media/
staticfiles/
local_settings.py

# Flask
instance/
.webassets-cache

# FastAPI
.pytest_cache/

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
package-lock.json
yarn.lock

# React / Vue / Build
dist/
build/
.next/
.nuxt/
.cache/
*.cache
coverage/

# Env / Secrets
.env
.env.*
*.pem
*.key

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
EOF
        echo -e "${GREEN}✓ 已创建 .gitignore${NC}"
    fi
    echo ""

    print_change_scope_report

    # 添加所有文件
    echo "→ 添加文件..."
    git add .
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: git add 失败${NC}"
        exit 1
    fi

    # 提交文件
    echo "→ 创建提交..."
    git commit -m "$COMMIT_MSG"
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: git commit 失败${NC}"
        exit 1
    fi
fi

# 推送到远程仓库
echo "→ 推送到 GitHub..."
# 检查是否首次推送
if git rev-parse --abbrev-ref --symbolic-full-name @{u} &>/dev/null; then
    # 已有 upstream，直接 push
    run_git push
else
    # 首次推送，设置 upstream
    run_git push -u origin main
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: git push 失败${NC}"
    echo "可能原因:"
    echo "  1. 网络连接问题"
    echo "  2. 没有仓库的写入权限"
    echo "  3. 远程仓库需要身份验证"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ 提交成功！${NC}"
echo "=========================================="
echo ""
echo "仓库地址: $REPO_URL"
echo "提交消息: $COMMIT_MSG"
echo "分支: main"
echo "Commit ID: $(git rev-parse HEAD)"
echo ""
