  <Dialog open={isFormOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[350px] max-h-[90vh] overflow-y-auto p-3">
      <DialogHeader className="pb-1">
        <DialogTitle className="text-sm">
          {invoice ? "تعديل فاتورة" : "فاتورة جديدة"}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          قم بإدخال بيانات الفاتورة أدناه
        </DialogDescription>
      </DialogHeader>
      
      <Form {...form}>
        {/* ... existing code ... */}
      </Form>
    </DialogContent>
  </Dialog> 