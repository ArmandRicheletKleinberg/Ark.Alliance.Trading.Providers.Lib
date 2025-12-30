# Common Services

## Overview

Core service infrastructure providing the base class for all provider services with lifecycle management, cancellation support, and streaming capabilities.

---

## Architecture

```mermaid
classDiagram
    direction TB
    
    class EventEmitter {
        <<Node.js>>
        +on(event, handler)
        +emit(event, data)
        +off(event, handler)
    }
    
    class BaseService {
        <<abstract>>
        #config: ServiceConfig
        #state: ServiceState
        #logger: LoggingService
        #cancellationSource: CancellationTokenSource
        +start() Promise~Result~
        +stop(reason?) Promise~Result~
        +restart() Promise~Result~
        +getState() ServiceState
        +isRunning() boolean
        #onStart()* Promise~void~
        #onStop()* Promise~void~
        #onStartHook?(token) Promise~void~
        #onShutdown?(token) Promise~void~
    }
    
    class ServiceState {
        <<enum>>
        STOPPED
        STARTING
        RUNNING
        STOPPING
        ERROR
        PAUSED
    }
    
    class ServiceConfig {
        <<interface>>
        instanceKey: string
        debug?: boolean
        autoRecover?: boolean
        lockTimeoutMs?: number
    }
    
    EventEmitter <|-- BaseService
    BaseService --> ServiceState
    BaseService --> ServiceConfig
    
    style BaseService fill:#e8f5e9
    style ServiceState fill:#e1f5fe
```

---

## Sequence: Service Lifecycle

```mermaid
sequenceDiagram
    autonumber
    
    participant App as Application
    participant Svc as BaseService
    participant Hook as onStartHook
    participant Token as CancellationToken
    
    rect rgb(232, 245, 233)
        Note over App,Token: Start Flow
        App->>Svc: start()
        Svc->>Svc: state = STARTING
        Svc->>Svc: onStart()
        Svc->>Hook: onStartHook(token)
        Hook-->>Svc: complete
        Svc->>Svc: state = RUNNING
        Svc-->>App: Result.Success
    end
    
    rect rgb(255, 243, 224)
        Note over App,Token: Stop Flow
        App->>Svc: stop(reason)
        Svc->>Svc: state = STOPPING
        Svc->>Token: cancel(reason)
        Svc->>Svc: onShutdown(token)
        Svc->>Svc: onStop()
        Svc->>Svc: state = STOPPED
        Svc-->>App: Result.Success
    end
```

---

## Files

| File | Purpose |
|:-----|:--------|
| `_BaseService.ts` | Abstract base service class |
| `ServiceState.ts` | Lifecycle state enum |
| `ServiceStatus.ts` | Health/operational status |
| `ServiceConfig.ts` | Configuration interface |
| `IStreamingService.ts` | Socket.IO streaming interface |
| `cancellation/` | CancellationToken pattern |
| `events/` | Dynamic event management |

---

## Usage

```typescript
import { BaseService, ServiceConfig, ServiceState } from 'ark-alliance-trading-providers-lib/Common/services';

class MyService extends BaseService {
    constructor(config: ServiceConfig) {
        super(config);
    }
    
    protected async onStart(): Promise<void> {
        // Initialize resources
        this.logger.info('Service starting...');
    }
    
    protected async onStop(): Promise<void> {
        // Cleanup resources
        this.logger.info('Service stopping...');
    }
    
    protected async onStartHook(token: CancellationToken): Promise<void> {
        // Optional: Register event handlers, start background tasks
    }
}

// Usage
const service = new MyService({ instanceKey: 'my-service', debug: true });
await service.start();
console.log(service.isRunning()); // true
await service.stop();
```

---

## Features

| Feature | Description |
|:--------|:------------|
| **Lifecycle Management** | `start()`, `stop()`, `restart()`, `pause()`, `resume()` |
| **Cancellation Support** | `CancellationToken` for graceful shutdown |
| **Auto Recovery** | Configurable retry on error |
| **Async Lock** | `withLock()` for concurrency control |
| **Built-in Cache** | `ConcurrentCache` for multi-instance services |
| **Streaming** | Socket.IO integration for real-time events |
