import "PYPITypes"

/// PYPI Storage Management (v2)
/// Defines storage paths and capabilities for the PYPI system

access(all) contract PYPIStorage {

    /// Storage Paths
    access(all) let AutopayStoragePath: StoragePath
    access(all) let AutopayPublicPath: PublicPath
    access(all) let AutopayPrivatePath: PrivatePath

    /// Capability Paths
    access(all) let ConfigManagerPath: StoragePath
    access(all) let ConfigManagerPublicPath: PublicPath
    access(all) let ConfigManagerPrivatePath: PrivatePath

    /// Resource interface for autopay configuration storage
    access(all) resource interface AutopayStoragePublic {
        access(all) fun getConfig(id: UInt64): PYPITypes.AutopayConfig?
        access(all) fun getActiveConfigs(): [PYPITypes.AutopayConfig]
        access(all) fun getConfigsByUser(userAddress: Address): [PYPITypes.AutopayConfig]
        access(all) fun getSystemStats(): PYPITypes.SystemStats
    }

    /// Resource for storing autopay configurations
    access(all) resource AutopayStorage: AutopayStoragePublic {
        access(self) let configs: {UInt64: PYPITypes.AutopayConfig}
        access(self) var nextConfigId: UInt64
        access(self) var systemStats: PYPITypes.SystemStats

        init() {
            self.configs = {}
            self.nextConfigId = 1
            self.systemStats = PYPITypes.SystemStats(
                totalAutopays: 0,
                activeAutopays: 0,
                totalPayments: 0,
                totalVolume: 0.0
            )
        }

        access(all) fun getConfig(id: UInt64): PYPITypes.AutopayConfig? {
            return self.configs[id]
        }

        access(all) fun getActiveConfigs(): [PYPITypes.AutopayConfig] {
            return self.configs.values.filter(view fun (config: PYPITypes.AutopayConfig): Bool {
                return config.isActive
            })
        }

        access(all) fun getConfigsByUser(userAddress: Address): [PYPITypes.AutopayConfig] {
            return self.configs.values.filter(view fun (config: PYPITypes.AutopayConfig): Bool {
                return config.owner == userAddress
            })
        }

        access(all) fun getSystemStats(): PYPITypes.SystemStats {
            return self.systemStats
        }

        access(all) fun addConfig(config: PYPITypes.AutopayConfig): UInt64 {
            let id = self.nextConfigId
            self.configs[id] = config
            self.nextConfigId = self.nextConfigId + 1
            
            self.systemStats = PYPITypes.SystemStats(
                totalAutopays: self.systemStats.totalAutopays + 1,
                activeAutopays: self.systemStats.activeAutopays + 1,
                totalPayments: self.systemStats.totalPayments,
                totalVolume: self.systemStats.totalVolume
            )
            
            return id
        }

        access(all) fun updateConfig(id: UInt64, config: PYPITypes.AutopayConfig) {
            if let oldConfig = self.configs[id] {
                if oldConfig.isActive && !config.isActive {
                    self.systemStats = PYPITypes.SystemStats(
                        totalAutopays: self.systemStats.totalAutopays,
                        activeAutopays: self.systemStats.activeAutopays - 1,
                        totalPayments: self.systemStats.totalPayments,
                        totalVolume: self.systemStats.totalVolume
                    )
                }
            }
            self.configs[id] = config
        }

        access(all) fun recordPayment(amount: UFix64) {
            self.systemStats = PYPITypes.SystemStats(
                totalAutopays: self.systemStats.totalAutopays,
                activeAutopays: self.systemStats.activeAutopays,
                totalPayments: self.systemStats.totalPayments + 1,
                totalVolume: self.systemStats.totalVolume + amount
            )
        }
    }

    init() {
        self.AutopayStoragePath = /storage/PYPIAutopayStorage
        self.AutopayPublicPath = /public/PYPIAutopayStorage
        self.AutopayPrivatePath = /private/PYPIAutopayStorage

        self.ConfigManagerPath = /storage/PYPIConfigManager
        self.ConfigManagerPublicPath = /public/PYPIConfigManager
        self.ConfigManagerPrivatePath = /private/PYPIConfigManager

        // Create and save the autopay storage
        let storage <- create AutopayStorage()
        self.account.storage.save(<-storage, to: self.AutopayStoragePath)

        // Create public capability
        self.account.capabilities.publish(
            self.account.capabilities.storage.issue<&{AutopayStoragePublic}>(
                self.AutopayStoragePath
            ),
            at: self.AutopayPublicPath
        )
    }
}
