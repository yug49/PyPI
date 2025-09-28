import "PYPI"

/// Get PYPI system health status
access(all) fun main(): String {
    return PYPI.getSystemHealth()
}